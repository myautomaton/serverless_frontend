import * as aws from "@pulumi/aws";
import * as ELEMENTS from "./elements"
import * as pulumi from "@pulumi/pulumi";

(async () => {

    var recipe_wl_cors = {
        src: "wl_cors", 
        runtime: "nodejs20.x",
        handler: "handler",
        provider: "edge",
        memorySize: 128,
        timeout: 30
    }
    var actions_wl_cors = [
        "iam:*",
        "s3:*"
    ]
    const lambdaWL_Cors = ELEMENTS.createLambda("prod", "cf-proxy-cors", recipe_wl_cors, actions_wl_cors, [], [], {})

    var recipe_wl_resize_image = {
        src: "wl_resize_img", 
        runtime: "nodejs20.x",
        handler: "lambda_handler",
        provider: "default",
    }
    var actions_wl_resize_image = [
        "iam:*",
        "s3:*"
    ]
    const lambdaWL_ResizeImage = ELEMENTS.createLambda("prod", "cf-proxy-resize", recipe_wl_resize_image, actions_wl_resize_image, [], [], {foo: "bar"})

    var recipe_wl_vr = {
        src: "wl_s3_vr", 
        runtime: "nodejs20.x",
        handler: "handler",
        provider: "edge",
        memorySize: 128,
        timeout: 30
    }
    var actions_wl_vr = [
        "iam:*",
        "s3:*",
        "lambda:GetFunction"
    ]
    const lambdaWLVR = ELEMENTS.createLambda("prod", "cf-proxy-vr", recipe_wl_vr, actions_wl_vr, [], [], {})

    var recipe_wl_certbot = {
        src: "wl_proxy_certbot", 
        runtime: "python3.12",
        handler: "lambda_handler",
        provider: "default"
    }
    var actions_wl_certbot = [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface",
        "ec2:*",
        "iam:*",
        "s3:*" 
    ]
    const lambdaWLCertbot = ELEMENTS.createLambda(
        "prod", 
        "cf-proxy-certbot", 
        recipe_wl_certbot, 
        actions_wl_certbot, 
        [
        ], 
        [
            "sg-0c9ca5938b69e95d6"
        ], 
        {foo: "bar"}
    )

    var recipe_wl_origin = {
        src: "wl_origin", 
        runtime: "nodejs20.x",
        handler: "handler",
        provider: "edge",
        memorySize: 128,
        timeout: 30
    }
    var actions_wl_origin = [
        "iam:*",
        "s3:*",
        "lambda:GetFunction"
    ]
    const lambdaWLOrigin = ELEMENTS.createLambda("prod", "cf-proxy-origin", recipe_wl_origin, actions_wl_origin, [], [], {})

    var recipe_wl_origin_frankfurt = {
        src: "wl_origin", 
        runtime: "nodejs20.x",
        handler: "handler",
        provider: "default",
        memorySize: 128,
        timeout: 30
    }
    var actions_wl_origin_frankfurt = [
        "iam:*",
        "s3:*",
        "lambda:GetFunction"
    ]
    const lambdaWLOriginFrankfurt = ELEMENTS.createLambda("prod", "cf-proxy-origin-frankfurt", recipe_wl_origin_frankfurt, actions_wl_origin_frankfurt, [], [], {})

})()