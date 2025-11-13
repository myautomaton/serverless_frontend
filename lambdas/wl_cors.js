'use strict';

const { request } = require("http");

exports.handler = async (event) => {
    const response = event.Records[0].cf.response;
    const headers = response.headers;

    // Get BU from custom header
    const bu = event.Records[0].cf.request.headers['int-bu'] ? event.Records[0].cf.request.headers['int-bu'][0].value : '';
    
    // Detect request origin
    // const originHeader = request.headers.origin ? request.headers.origin[0].value : '*';

    // if (request.method === 'OPTIONS') {
    //     return {
    //     status: '200',
    //     statusDescription: 'OK',
    //     headers: {
    //         'access-control-allow-origin': [{ key: 'Access-Control-Allow-Origin', value: '*' }],
    //         'access-control-allow-methods': [{ key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' }],
    //         'access-control-allow-headers': [{ key: 'Access-Control-Allow-Headers', value: '*' }]
    //     }
    //     };
    // }
    //

    if (request.method === 'OPTIONS') {
        return {
            status: '204',
            statusDescription: 'No Content',
            headers: {
                'access-control-allow-origin': [{ key: 'Access-Control-Allow-Origin', value: '*' }],
                'access-control-allow-methods': [{ key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS, PUT, PATCH, DELETE' }],
                'access-control-allow-headers': [{ key: 'Access-Control-Allow-Headers', value: '*' }],
                'access-control-allow-credentials': [{ key: 'Access-Control-Allow-Credentials', value: 'true' }],
                'access-control-max-age': [{ key: 'Access-Control-Max-Age', value: '1728000' }],
                'content-type': [{ key: 'Content-Type', value: 'text/plain; charset=UTF-8' }],
                'content-length': [{ key: 'Content-Length', value: '0' }]
            }
        };
    }

    // Add custom header (header names must be lowercase)
    headers['wl-lambda-edge'] = [{
        key: 'WL-Lambda-Edge',
        value: 'HitFromLambdaEdge'
    }];
    if (!headers['access-control-allow-credentials']) {
        delete headers['access-control-allow-credentials'];
        headers['access-control-allow-credentials'] = [{
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
        }];
    }
    // add access-control-allow-origin if not present
    if ( headers['access-control-allow-origin']) {
        delete headers['access-control-allow-origin'];
    }
    headers['access-control-allow-origin'] = [{
        key: 'Access-Control-Allow-Origin',
        value: '*'
    }];
    if (!headers['access-control-expose-methods']) {
        delete headers['access-control-expose-methods'];
        headers['access-control-expose-methods'] = [{
            key: 'Access-Control-Expose-Methods',
            value: 'GET, POST, OPTIONS, PUT, PATCH, DELETE'
        }];
    }
    if (!headers['access-control-allow-headers']) {
        delete headers['access-control-allow-headers'];
        headers['access-control-allow-headers'] = [{
            key: 'Access-Control-Allow-Headers',
            value: '*'
        }];
    }
    headers['Content-Security-Policy'] = [{
        key: 'Content-Security-Policy',
        value: "upgrade-insecure-requests"
    }];
    headers['Access-Control-Max-Age'] = [{
        key: 'Access-Control-Max-Age',
        value: '1728000'
    }];

    return response;
};