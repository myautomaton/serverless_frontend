import * as aws from "@pulumi/aws";
import * as ELEMENTS from "../elements"

export function createCF (env:string, nameAppend: string, url: any) {
    (async()=>{
        url = await ELEMENTS.GetValue(url)
        url = url.replace("https://", "").replace("/", "")
        var CF = new aws.cloudfront.Distribution(env+"-"+nameAppend+"-cf", {
            origins: [
                {
                    originId: env+"-"+nameAppend+"-origin",
                    domainName: url,
                    connectionAttempts: 3,
                    connectionTimeout: 10,
                    customHeaders: [
                        {
                            name : "Custom-Check",
                            value: ""
                        }
                    ],
                    customOriginConfig: {
                        httpPort: 80,
                        httpsPort: 443,
                        originKeepaliveTimeout: 5,
                        originProtocolPolicy: "https-only",
                        originReadTimeout: 5,
                        originSslProtocols: [
                            "TLSv1.2"
                        ],
                    },
                    originPath: ""
                }
            ],
            enabled: true,
            isIpv6Enabled: true,
            comment: env+"-"+nameAppend,
            defaultRootObject: "index.html",
            defaultCacheBehavior: {
                allowedMethods: [
                    "DELETE",
                    "GET",
                    "HEAD",
                    "OPTIONS",
                    "PATCH",
                    "POST",
                    "PUT",
                ],
                cachedMethods: [
                    "GET",
                    "HEAD",
                ],
                targetOriginId: env+"-"+nameAppend+"-origin",
                viewerProtocolPolicy: "allow-all",
                minTtl: 0,
                defaultTtl: 0,
                maxTtl: 0,
                cachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
                originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
                responseHeadersPolicyId: "bfa36c6c-1616-49ac-b00b-cde9fc26507d"
            },
            orderedCacheBehaviors: [
                {
                    pathPattern: "/content/*",
                    allowedMethods: [
                        "GET",
                        "HEAD",
                        "OPTIONS",
                    ],
                    cachedMethods: [
                        "GET",
                        "HEAD",
                    ],
                    targetOriginId: env+"-"+nameAppend+"-origin",
                    forwardedValues: {
                        queryString: false,
                        cookies: {
                            forward: "none",
                        },
                    },
                    minTtl: 0,
                    defaultTtl: 3600,
                    maxTtl: 86400,
                    compress: true,
                    viewerProtocolPolicy: "redirect-to-https",
                },
            ],
            priceClass: "PriceClass_200",
            restrictions: {
                geoRestriction: {
                    restrictionType: "whitelist",
                    locations: [
                        "US",
                        "CA",
                        "GB",
                        "DE",
                        "BG"
                    ],
                },
            },
            tags: {
                Environment: "production",
            },
            viewerCertificate: {
                cloudfrontDefaultCertificate: true,
            },
        });
        return CF
    })();


}