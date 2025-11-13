const myyaml = require("js-yaml");
import * as fs from "fs";
import * as pulumi from "@pulumi/pulumi";

export function GetValue<T>(output: pulumi.Output<T>) {
    return new Promise<T>((resolve, reject)=>{
        output.apply(value=>{
            resolve(value);
        });
    });
}

export async function readFile(file: string) {
    var data = myyaml.load(
        fs.readFileSync(process.cwd() + "/config/" + file, 'utf-8')
    );
    return data;
}