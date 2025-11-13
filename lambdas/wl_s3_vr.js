'use strict';

exports.handler = async (event) => {
  const request = event.Records[0].cf.request;

  if (request.method === 'OPTIONS') {
    return {
      status: '204',
      statusDescription: 'No Content',
      headers: {
        'access-control-allow-origin': [
          { key: 'Access-Control-Allow-Origin', value: '*' }
        ],
        'access-control-allow-methods': [
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS, PUT, PATCH, DELETE' }
        ],
        'access-control-allow-headers': [
          { key: 'Access-Control-Allow-Headers', value: '*' }
        ],
        'access-control-allow-credentials': [
          { key: 'Access-Control-Allow-Credentials', value: 'true' }
        ],
        'access-control-max-age': [
          { key: 'Access-Control-Max-Age', value: '1728000' }
        ]
      }
    };
  }

  const host = (request.headers['host'] && request.headers['host'][0] && request.headers['host'][0].value) ? request.headers['host'][0].value : '';
  request.headers['x-forwarded-host'] = [{ key: 'X-Forwarded-Host', value: host }];

  return request;
};