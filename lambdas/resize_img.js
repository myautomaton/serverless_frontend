exports.lambda_handler = async (event) => {
    try {
        // IMPORTS
        const sharp = require("sharp");
        const AWS   = require("aws-sdk");

        // SET VARIABLES
        const url = String(event.rawPath || "");
        let width = 0;
        let height = 0;
        let format = "auto";
        let file_path = "";

        const defaultWidth = 256;
        const defaultHeight = 256;

        // Initialize S3 client
        const s3 = new AWS.S3();
        const srcBucket = event.headers["int-src-bucket"];
        if (!srcBucket) {
            return {
                statusCode: 403,
                body: "Error: Direct access not allowed"
            };
        }

        // Parse URL for width, height, format, and file path
        // Example URL: /resize,width=300,height=200,format=auto/path/to/image.jpg
        if (!url) {
            throw new Error("No URL path found");
        }
        const url_parts = url.split(',');
        for (let part of url_parts) {
            if (part.includes('width=')) {
                const value = part.split('=')[1];
                if (value && !isNaN(value)) {
                    width = parseInt(value);
                }
            }
            if (part.includes('height=')) {
                const value = part.split('=')[1];
                if (value && !isNaN(value)) {
                    height = parseInt(value);
                }
            }
            if (part.includes('format=')) {
                format = part.split('=')[1];
            }
        }
        file_path = url.split('format=auto/')[1];
        if (!file_path) {
            file_path = url.split('gravity=top/')[1];
            if (!file_path) {
                file_path = url.split('format=webp/')[1];
                if (!file_path) {
                    throw new Error("No file path found in URL 3");
                }
            }
        }

        // Download original image from S3
        // If the file does not exist, return 404
        let original;
        try {
            original = await s3.getObject({
                Bucket: srcBucket,
                Key: file_path
            }).promise();
        } catch (error) {
            if (error.code === 'NoSuchKey') {
                return {
                    statusCode: 404,
                    body: "Error: File not found"
                };
            }
            throw error;
        }
        // Get original file width and height
        const metadata = await sharp(original.Body).metadata();
        const originalWidth = metadata.width;
        const originalHeight = metadata.height;

        // Resize with Sharp (use parsed width/height, with defaults)

        // Check if format is preserved or not and set new width/height accordingly
        let widthNew = 0;
        let heightNew = 0;
        // if width is set, convert height to preserve aspect ratio
        if (width !== 0) {
            widthNew = width;
            heightNew = Math.round((width / originalWidth) * originalHeight);
        }
        if (height !== 0) {
            heightNew = height;
            widthNew = Math.round((height / originalHeight) * originalWidth);
        }
        // if both width and height are 0, set to default 500x500
        if (width === 0 && height === 0) {
            widthNew = defaultWidth;
            heightNew = Math.round((defaultHeight / originalWidth) * originalHeight);
        }
        // Determine output format
        let outputFormat = metadata.format; //format === "auto" ? metadata.format : format;
        // Validate outputFormat for sharp
        const validFormats = ["jpeg", "png", "webp", "gif", "tiff", "avif", "heif", "bmp", "ico", "jpg"];
        if (!validFormats.includes(outputFormat)) {
            outputFormat = "png";
        }
        // Perform the resize operation
        const resizedBuffer = await sharp(original.Body)
            .resize(
                widthNew, 
                heightNew, 
                { fit: "inside" }
            )
            .toFormat("webp")
            .toBuffer();
            // .toFormat(outputFormat)

        // Return the resized image to the client
        // const contentType = metadata.format === 'jpeg' ? 'image/jpeg' : 
        //                     metadata.format === 'png' ? 'image/png' : 
        //                     metadata.format === 'webp' ? 'image/webp' : 
        //                     metadata.format === 'gif' ? 'image/gif' : 
        //                     metadata.format === 'tiff' ? 'image/tiff' :
        //                     metadata.format === 'svg' ? 'image/png' : // convert svg to png for output
        //                     metadata.format === 'avif' ? 'image/avif' :
        //                     metadata.format === 'heif' ? 'image/heif' :
        //                     metadata.format === 'bmp' ? 'image/bmp' :
        //                     metadata.format === 'ico' ? 'image/vnd.microsoft.icon' :
        //                     'application/octet-stream';
        // Return the resized image to the client
        const contentType = metadata.format === 'svg' ? 'image/svg+xml' : 'image/webp';
        
        const origin = event.headers.origin || event.headers.Origin || "";
        // replace Access-Control-Allow-Origin value
        // event.headers["Access-Control-Allow-Origin"] = [{ key: "Access-Control-Allow-Origin", value: origin || "*" }];
        headers = {};
        headers["Access-Control-Allow-Origin"] = "*";
        headers["Content-Type"] = "image/webp";
        body = resizedBuffer.toString('base64');
        isBase64Encoded = true;
        if (metadata.format === 'svg') {
            headers["Content-Type"] = "image/svg+xml";
            headers["Cache-Control"] = "max-age=86400"; // cache svg for 1 day
            body = original.Body.toString('utf-8');
            isBase64Encoded = false;
        }
        return {
            statusCode: 200,
            headers: headers,
            body: body,
            isBase64Encoded: isBase64Encoded
        };

    } catch (error) {
        console.error("Error processing request:", error);
        return {
            statusCode: 500,
            body: "Error: " + error.message
        };
    }
};
