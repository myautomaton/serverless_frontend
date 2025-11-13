def lambda_handler(event, context):
    try:
        import re
        import boto3
        import base64
        from io import BytesIO
        import PIL
        # from PIL import Image
        import os
        #try catch
        uri = str(event['requestContext']['http']['path'])
        uri_parts = uri.split(',')
        width = 0
        height = 0
        for part in uri_parts:
            if 'width=' in part:
                width = part.split('=')[1]
            if 'height=' in part:
                height = part.split('=')[1]
        
        file_path = uri.split('format=auto/')[1]

        s3 = boto3.client("s3")

        # Fetch image from S3
        s3_object = s3.get_object(Bucket="f", Key=file_path)


        # Open and resize image
        img_data = s3_object["Body"].read()
        img = PIL.Image.open(BytesIO(img_data))
        img_resized = img.resize((int(width), int(height)))




        return {
            "status": "200",
            "body": f"Extracted:Width: {width}Height: {height}Path: {file_path}"
        }
    except Exception as e:
        return {
            "status": "500",
            "body": f"Error: {str(e)}"
        }


# def lambda_handler(event, context):
#     try:
#         # Open and resize image
#         img = Image.open(BytesIO(img_data))
#         img_resized = img.resize((width, height))

#         # Convert back to bytes
#         buffer = BytesIO()
#         img_format = img.format or "JPEG"
#         img_resized.save(buffer, format=img_format)
#         buffer.seek(0)

#         # Base64 encode for API Gateway
#         encoded_image = base64.b64encode(buffer.read()).decode("utf-8")

#         return {
#             "statusCode": 200,
#             "headers": {
#                 "Content-Type": f"image/{img_format.lower()}",
#             },
#             "isBase64Encoded": True,
#             "body": encoded_image
#         }

#     except Exception as e:
#         return {
#             "statusCode": 500,
#             "body": f"Error: {str(e)}"
#         }
