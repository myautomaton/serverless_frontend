import * as aws from "@pulumi/aws";
import { Gateway } from "@pulumi/aws/directconnect";
import { InternetGateway, Vpc } from "@pulumi/aws/ec2";
import { provider } from "@pulumi/pulumi";

export function createVPC (env: string, nameAppend: string, cidr: string, tenancy: string, provider:any , tags?: any) {
    if (provider != "default") {
        var vpc =  new aws.ec2.Vpc(env+"-"+nameAppend, {
            cidrBlock: cidr,
            instanceTenancy: tenancy,
            enableDnsSupport: true,
            enableDnsHostnames: true,
            tags: tags
        }, { provider: provider });
    } else{
        var vpc =  new aws.ec2.Vpc(env+"-"+nameAppend, {
            cidrBlock: cidr,
            instanceTenancy: tenancy,
            enableDnsSupport: true,
            enableDnsHostnames: true,
            tags: tags
        });

    }
    return vpc
}

export function createGW (env: string, nameAppend: string, vpc: Vpc, provider: any, tags?: any) {
    if (provider != "default") {
        return new aws.ec2.InternetGateway(env+"-"+nameAppend, {
            vpcId: vpc.id,
            tags: tags,
        }, { provider: provider });
    } else {
        return new aws.ec2.InternetGateway(env+"-"+nameAppend, {
            vpcId: vpc.id,
            tags: tags,
        })
    }
}

export function createSubnet (env: string, nameAppend: string, vpc: Vpc, cidr: string, region: string, zone: string, isPublic: boolean, provider: any, peeringConnection: any, gw?: InternetGateway, tags?: any){
    if (provider != "default") {
        var subnet = new aws.ec2.Subnet(env+"-"+nameAppend, {
            vpcId: vpc.id,
            cidrBlock: cidr,
            availabilityZone: region+zone,
            mapPublicIpOnLaunch: isPublic,
            tags: tags,
        }, { provider:provider });
    } else {
        var subnet = new aws.ec2.Subnet(env+"-"+nameAppend, {
            vpcId: vpc.id,
            cidrBlock: cidr,
            availabilityZone: region+zone,
            mapPublicIpOnLaunch: isPublic,
            tags: tags,
        });
    }
    // VPC GW
    // const gwEip = new aws.ec2.Eip(env+"-gw-eip", {
    //     vpc: true, // Associate the EIP with a VPC
    // });
    // const natGateway = new aws.ec2.NatGateway(env+"-gw", {
    //     allocationId: gwEip.id,
    //     subnetId: subnet.id,
    //     tags: tags
    // });
    // const routeTable = new aws.ec2.RouteTable(env+"-rt", {
    //     vpcId: vpc.id, 
    //     routes: [{
    //         cidrBlock: "0.0.0.0/0",
    //         natGatewayId: natGateway.id,
    //     }],
    // });
    // const routeTableAssociation = new aws.ec2.RouteTableAssociation(env+"-rt-ass", {
    //     subnetId: subnet.id,
    //     routeTableId: routeTable.id,
    // }); 
    if (gw) {
        var routes = [];
        routes.push({
            cidrBlock: "0.0.0.0/0",
            gatewayId: gw.id,
        });
        // if peering connection list is not empty add routes
        if (peeringConnection != "") {
            for (let i = 0; i < peeringConnection.length; i++) {
                routes.push({
                    cidrBlock: peeringConnection[i].cidr,
                    vpcPeeringConnectionId: peeringConnection[i].id,
                });
            }
        }
        if (provider != "default") {
            var routeTable1 = new aws.ec2.RouteTable(env+"-"+nameAppend+"-rt", {
                vpcId: vpc.id,
                routes: routes
            }, { provider: provider });
        } else {
            var routeTable1 = new aws.ec2.RouteTable(env+"-"+nameAppend+"-rt", {
                vpcId: vpc.id,
                routes: routes
            });
        }

        if (provider != "default") {
            const routeTableAssociation = new aws.ec2.RouteTableAssociation(env+"-"+nameAppend+"-rta", {
                subnetId: subnet.id,
                routeTableId: routeTable1.id,
            }, { provider: provider });
        } else {
            const routeTableAssociation = new aws.ec2.RouteTableAssociation(env+"-"+nameAppend+"-rta", {
                subnetId: subnet.id,
                routeTableId: routeTable1.id,
            });
        }
    }
    return subnet
}





 