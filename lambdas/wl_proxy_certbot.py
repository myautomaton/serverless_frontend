import json
import requests

# Internal service (private IP or internal DNS in VPC)
# INTERNAL_HOST = "10.50.55.95"
INTERNAL_PORT = 443

def lambda_handler(event, context):
    """
    Lambda function to proxy pass all requests to an internal service.
    Supports GET, POST, PUT, DELETE, PATCH, etc.
    """
    try:
        # Determine path
        path = event.get("path") or event.get("rawPath") or "/"

        # Determine query string
        qs_dict = event.get("queryStringParameters") or {}
        qs_raw = event.get("rawQueryString") or ""
        
        if qs_dict:
            qs = "&".join(f"{k}={v}" for k, v in qs_dict.items())
        elif qs_raw:
            qs = qs_raw
        else:
            qs = ""


        # Extract method, headers, and body
        method = event.get("httpMethod", "GET")
        headers = event.get("headers") or {}

        BU = headers.get("int-bu", "unknown").lower()
        Referer = headers.get("Referer", "unknown").lower()
        Origin = headers.get("Origin", "unknown").lower()
        DESTINATION_HOST = headers.get("int-destination-host", INTERNAL_HOST).lower()

        headers["Referer"] = f"https://{DESTINATION_HOST}/"  # Override Referer header if needed
        headers["Origin"] = f"https://{DESTINATION_HOST}"   # Override Origin header if needed
        headers["Host"] = f"{Referer}"  # Override Host header if needed
        headers["X-Forwarded-Proto"] = "HTTPS"  # Indicate original protocol
        headers["X-Real-IP"] = event.get("requestContext", {}).get("identity", {}).get("sourceIp", "")
        headers["X-Forwarded-For"] = event.get("requestContext", {}).get("identity", {}).get("sourceIp", "")
        # Get client ip from client ip or X-Forwarded-For header
        client_ip = headers.get("X-Client-IP") or headers.get("X-Forwarded-For", "").split(",")[0].strip()
        if client_ip:
            headers["CF-Connecting-IP"] = client_ip  # Cloudflare original client IP header if needed
        
        body = event.get("body", None)
        
        # If body is base64 encoded (for binary payloads), decode
        if event.get("isBase64Encoded", False) and body:
            import base64
            body = base64.b64decode(body)

        if qs:
            # Convert dict to query string
            url = f"http://{DESTINATION_HOST}{path}?{qs}"
        else:
            url = f"http://{DESTINATION_HOST}{path}"

        # Forward the request to the internal service
        resp = requests.request(
            method=method,
            url=url,
            headers=headers,
            data=body,
            allow_redirects=False,
            timeout=15,
            verify=False,  # Disable SSL certificate verification
        )

        # Return the internal service response to the caller
        resp.headers["WL-Proxy-By"] = "Lambda Proxy"
        resp.headers["WL-query"] = qs if qs else "No query"
        resp.headers["WL-path"] = path
        resp.headers["WL-method"] = method
        resp.headers["WL-bu"] = BU
        resp.headers["WL-referer"] = Referer
        resp.headers["WL-origin"] = Origin
        resp.headers["WL-destination-host"] = DESTINATION_HOST
        resp.headers["WL-URL"] = url
        resp.headers["WL-status"] = str(resp.status_code)
        resp.headers["WL-body"] = body if body else "No body"
        return {
            "statusCode": resp.status_code,
            "headers": dict(resp.headers),
            "body": resp.text,
            "isBase64Encoded": False
        }
    except Exception as e:
        # Handle exceptions and return error response
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
            "isBase64Encoded": False
        }