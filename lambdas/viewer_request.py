def lambda_handler(event, context):
    request = event['Records'][0]['cf']['request']
    host = request['headers']['host'][0]['value']

    # Route based on host
    subdomain = host.split('.')[0]

    # Add debug header
    request['headers']['x-lambda-executed'] = [{
        "key": "x-lambda-executed",
        "value": "yes"
    }]

    if subdomain == "cdn":
        request['origin'] = {
            "custom": {
                "domainName": "",
                "port": 443,
                "protocol": "https",
                "path": "",
                "sslProtocols": ["TLSv1.2"],
                "readTimeout": 5,
                "keepaliveTimeout": 5,
                "customHeaders": {}
            }
        }
    elif subdomain == "bucdn":
        request['origin'] = {
            "custom": {
                "domainName": "",
                "port": 443,
                "protocol": "https",
                "path": "",
                "sslProtocols": ["TLSv1.2"],
                "readTimeout": 5,
                "keepaliveTimeout": 5,
                "customHeaders": {}
            }
        }

    # Forward Host header to origin
    request['headers']['host'] = [{"key": "host", "value": host}]
    return request
