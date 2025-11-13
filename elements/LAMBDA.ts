import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as archive from "@pulumi/archive";
import { provider } from "@pulumi/pulumi";

export type lambdaRecipe = {
    src: string,
    runtime: string,
    handler: string,
    provider: string,
    memorySize?: number,
    timeout?: number,
    layers?: string[]
}
const providers: { [key: string]: aws.Provider } = {
    "edge": new aws.Provider("us_provider", { region: "us-east-1" }),
    "frankfurt": new aws.Provider("eu_provider", { region: "eu-central-1" }),
}

export function createLambda (
        env:string, 
        nameAppend: string, 
        recipe: lambdaRecipe, 
        actions: Array<string>, 
        subnets: any, 
        sg: any, 
        vars: any,
        tags?: any
    ) {
    
    const assumeRole = aws.iam.getPolicyDocument({
        statements: [
            {
                sid: "1",
                effect: "Allow",
                principals: [{
                    type: "Service",
                    identifiers: [
                        "edgelambda.amazonaws.com",
                        "lambda.amazonaws.com"
                    ],
                }],
                actions: [
                    "sts:AssumeRole"
                ],
            },
        ],
    });
    const policyOne = new aws.iam.Policy(env+"-"+nameAppend+"-policy", {policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: actions,
            Effect: "Allow",
            Resource: "*",
        }],
    })});
    const iamForLambda = new aws.iam.Role(env+"-"+nameAppend+"-iam", {
        assumeRolePolicy: assumeRole.then(assumeRole => assumeRole.json),
        managedPolicyArns: [
            policyOne.arn,
            "",
            ""
        ],
        tags: tags
    });
    let lambdaArchive: pulumi.Input<pulumi.asset.Archive>;
    if (recipe.runtime.includes("python")){
        var filetype = ".py"
        lambdaArchive = new pulumi.asset.AssetArchive({
            "certifi/": new pulumi.asset.FileArchive("lambdas/certifi/"),
            "charset_normalizer/": new pulumi.asset.FileArchive("lambdas/charset_normalizer/"),
            "idna/": new pulumi.asset.FileArchive("lambdas/idna/"),
            "requests/": new pulumi.asset.FileArchive("lambdas/requests/"),
            "urllib3/": new pulumi.asset.FileArchive("lambdas/urllib3/"),
            "PIL/": new pulumi.asset.FileArchive("lambdas/PIL/"),
            "bytesbufio/": new pulumi.asset.FileArchive("lambdas/bytesbufio/"),
            "index.py": new pulumi.asset.FileAsset("lambdas/"+recipe.src+filetype) // Archive a single file
        });
    } else {
        var filetype = ".js"
        lambdaArchive = new pulumi.asset.AssetArchive({
            "package.json": new pulumi.asset.FileAsset("lambdas/package.json"),
            "node_modules/": new pulumi.asset.FileArchive("lambdas/node_modules/"),
            "@aws-sdk/": new pulumi.asset.FileArchive("lambdas/node_modules/@aws-sdk/"),
            "sharp/": new pulumi.asset.FileArchive("lambdas/node_modules/sharp/"),
            "index.js": new pulumi.asset.FileAsset("lambdas/"+recipe.src+filetype) // Archive a single file
        });
    }
    
    // const lambda = archive.getFile({
    //     type: "zip",
    //     sourceFile: "lambdas/"+recipe.src+filetype,
    //     outputPath: "lambdas/"+recipe.src+".zip",
    // });
    // const lambda_requests = archive.getFile({
    //     type: "zip",
    //     sourceFile: "lambdas/requests/",
    //     outputPath: "lambdas/"+recipe.src+".zip",
    // });

    const logGroupResource = new aws.cloudwatch.LogGroup(env+"-"+nameAppend+"-"+recipe.src+"-lg", {
        logGroupClass: "STANDARD",
        name: "/aws/lambda/"+env+"-"+nameAppend+"-"+recipe.src,
        retentionInDays: 0,
        skipDestroy: false,
    });

    let loadbalancerLambda: aws.lambda.Function;
    let url: aws.lambda.FunctionUrl;
    if (recipe.provider == "default") {
        loadbalancerLambda = new aws.lambda.Function(env+"-"+nameAppend+"-"+recipe.src, {
            name: env+"-"+nameAppend+"-"+recipe.src,
            code: lambdaArchive,
            layers: recipe.layers ?? [],
            memorySize: recipe.memorySize ?? 256,
            timeout: recipe.timeout ?? 600,
            vpcConfig: {
                subnetIds: subnets,
                securityGroupIds: sg,
                ipv6AllowedForDualStack: false,
            },
            role: iamForLambda.arn,
            handler: "index."+recipe.handler,
            runtime: recipe.runtime,
            environment: {
                variables: vars,
            }
        });

        url = new aws.lambda.FunctionUrl(env+"-"+nameAppend+"-url", {
            functionName: loadbalancerLambda.name,
            authorizationType: "NONE",
            cors: {
                allowCredentials: true,
                allowOrigins: ["*"],
                allowMethods: ["POST", "GET", "HEAD"],
                allowHeaders: ["*"],
                exposeHeaders: ["*"],
                maxAge: 0,
            },
        });
    } else {
        loadbalancerLambda = new aws.lambda.Function(env+"-"+nameAppend+"-"+recipe.src, {
            name: env+"-"+nameAppend+"-"+recipe.src,
            code: lambdaArchive,
            layers: recipe.layers ?? [],
            memorySize: recipe.memorySize ?? 256,
            timeout: recipe.timeout ?? 600,
            vpcConfig: {
                subnetIds: subnets,
                securityGroupIds: sg,
                ipv6AllowedForDualStack: false,
            },
            role: iamForLambda.arn,
            handler: "index."+recipe.handler,
            runtime: recipe.runtime,
            environment: {
                variables: vars,
            }
        },{ provider: providers[recipe.provider] });

        url = new aws.lambda.FunctionUrl(env+"-"+nameAppend+"-url", {
            functionName: loadbalancerLambda.name,
            authorizationType: "NONE",
            cors: {
                allowCredentials: true,
                allowOrigins: ["*"],
                allowMethods: ["POST", "GET", "HEAD"],
                allowHeaders: ["*"],
                exposeHeaders: ["*"],
                maxAge: 0,
            },
        },{ provider: providers[recipe.provider] });
    }

    if (recipe.provider == "edge") {
        const lambdaPermission = new aws.lambda.Permission(env + "-" + nameAppend + "-" + recipe.src + "-perm", {
            action: "lambda:GetFunction",
            function: loadbalancerLambda.name,
            principal: "edgelambda.amazonaws.com"
            // No sourceArn means any CloudFront distribution can invoke it
        }, { provider: providers[recipe.provider] });
    }
    return url
}