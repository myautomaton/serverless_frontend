def lambda_handler(event, context):
    try:
        response = event['Records'][0]['cf']['response']
        headers = response['headers']
    except (KeyError, IndexError) as e:
        # Return a default response or handle the error as needed
        return {
            'status': '500',
            'statusDescription': 'Internal Server Error',
            'headers': {
                'content-type': [{
                    'key': 'Content-Type',
                    'value': 'text/plain'
                }]
            },
            'body': f'Error processing event: {str(e)}'
        }

    # Set or overwrite security headers
    headers['strict-transport-security'] = [{
        'key': 'Strict-Transport-Security',
        'value': 'max-age=63072000; includeSubDomains; preload'
    }]
    headers['content-security-policy'] = [{
        'key': 'Content-Security-Policy',
        'value': "default-src 'self'"
    }]
    headers['x-content-type-options'] = [{
        'key': 'X-Content-Type-Options',
        'value': 'nosniff'
    }]
    headers['x-frame-options'] = [{
        'key': 'X-Frame-Options',
        'value': 'DENY'
    }]
    headers['x-xss-protection'] = [{
        'key': 'X-XSS-Protection',
        'value': '1; mode=block'
    }]
    headers['referrer-policy'] = [{
        'key': 'Referrer-Policy',
        'value': 'strict-origin-when-cross-origin'
    }]
    headers['wl-headers'] = [{
        'key': 'WL-Headers',
        'value': 'Hit from Lambda@Edge'
    }]

    return response