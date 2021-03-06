/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// const adminUserId = 'admin';
// const adminUserPasswd = 'adminpw';
const logger = require("../middleware/logger");
const { blockchainConst } = require("../config/blockchain");

/**
 *
 * @param {*} FabricCAServices
 * @param {*} ccp
 */
exports.buildCAClient = (FabricCAServices, ccp, caHostName) => {
    // Create a new CA client for interacting with the CA.
    // caHostName = 'ca.org1.example.com' // change for testing in local
    const caInfo = ccp.certificateAuthorities[caHostName]; //lookup CA details from config
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const caClient = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: true }, caInfo.caName);

    logger.info(`Built a CA Client named ${caInfo.caName}`);
    return caClient;
};

exports.enrollAdmin = async(caClient, wallet, orgMspId) => {
    try {
        // Check to see if we've already enrolled the admin user.
        const identity = await wallet.get(blockchainConst.caAdmin);
        if (identity) {
            logger.debug('An identity for the admin user already exists in the wallet');
            return;
        }

        logger.info("Admin Identity not found... Enroll admin")
            // Enroll the admin user, and import the new identity into the wallet.
        const enrollment = await caClient.enroll({ enrollmentID: blockchainConst.caAdmin, enrollmentSecret: blockchainConst.caAdminPw });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: orgMspId,
            type: 'X.509',
        };

        console.log("x509Id", x509Identity)
        console.log("putting into wallet")
        await wallet.put(blockchainConst.caAdmin, x509Identity);
        console.log('Successfully enrolled admin user and imported it into the wallet');
    } catch (error) {
        console.error(`Failed to enroll admin user : ${error}`);

    }
};

exports.registerAndEnrollUser = async(caClient, wallet, orgMspId, userId, affiliation) => {
    try {
        // Check to see if we've already enrolled the user
        const userIdentity = await wallet.get(userId);
        if (userIdentity) {
            console.log(`An identity for the user ${userId} already exists in the wallet`);
            return;
        }

        // Must use an admin to register a new user
        const adminIdentity = await wallet.get(blockchainConst.caAdmin);
        if (!adminIdentity) {
            console.log('An identity for the admin user does not exist in the wallet');
            console.log('Enroll the admin user before retrying');
            return;
        }

        // build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, blockchainConst.caAdmin);

        // Register the user, enroll the user, and import the new identity into the wallet.
        // if affiliation is specified by client, the affiliation value must be configured in CA
        const secret = await caClient.register({
            affiliation: affiliation,
            enrollmentID: userId,
            role: 'client'
        }, adminUser);
        const enrollment = await caClient.enroll({
            enrollmentID: userId,
            enrollmentSecret: secret
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: orgMspId,
            type: 'X.509',
        };
        await wallet.put(userId, x509Identity);
        console.log(`Successfully registered and enrolled user ${userId} and imported it into the wallet`);
    } catch (error) {
        console.error(`Failed to register user : ${error}`);
    }
};


exports.registerAndEnrollUserMongo = async(caClient, wallet, orgMspId, userId, affiliation) => {
    try {
        logger.info("---register user start--", userId.toString())
            // Check to see if we've already enrolled the user
        const userIdentity = await wallet.get(userId);
        if (userIdentity) {
            logger.debug(`An identity for the user ${userId} already exists in the wallet`);
            return "User already present";
        }

        // Must use an admin to register a new user
        const adminIdentity = await wallet.get(blockchainConst.caAdmin);
        // console.log("-----adminIdentity ", adminIdentity)
        if (!adminIdentity) {
            console.log('An identity for the admin user does not exist in the wallet');
            console.log('Enroll the admin user before retrying');
            return;
        }

        // build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, blockchainConst.caAdmin);

        // Register the user, enroll the user, and import the new identity into the wallet.
        // if affiliation is specified by client, the affiliation value must be configured in CA
        const secret = await caClient.register({
            affiliation: affiliation,
            enrollmentID: userId,
            role: 'client'
        }, adminUser);
        const enrollment = await caClient.enroll({
            enrollmentID: userId,
            enrollmentSecret: secret
        });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: orgMspId,
            type: 'X.509',
        };
        let data = {
                role: "client",
                email: userId,

                certificate: x509Identity,
                "mspId": orgMspId,
                credentials: x509Identity.credentials,
                version: 1,
                type: 'X.509'
            }
            // logger.info("---dtafrom gdter user--")
        let putData = await wallet.put(userId, data);
        // console.log("putdata register user : putData", putData)
        logger.debug(`Successfully registered and enrolled user ${userId} and imported it into the wallet`);
    } catch (error) {
        logger.error(`Failed to register user : ${error}`);
        return error
    }
};

/**
 * 
 * @param {*} caClient 
 * @param {*} wallet 
 * @param {*} orgMspId 
 * @returns 
 */
exports.enrollAdminMongo = async(caClient, wallet, orgMspId) => {
    try {
        // Check to see if we've already enrolled the admin user.
        const identity = await wallet.get(blockchainConst.caAdmin);
        if (identity) {
            console.log('An identity for the admin user already exists in the wallet');
            return;
        }

        console.log("Admin Identity not found... Enroll admin")

        // Enroll the admin user, and import the new identity into the wallet.
        const enrollment = await caClient.enroll({ enrollmentID: blockchainConst.caAdmin, enrollmentSecret: blockchainConst.caAdminPw });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: orgMspId,
            type: 'X.509',
        };
        let data = {

            "mspId": orgMspId,
            credentials: x509Identity.credentials,
            version: 1,
            type: 'X.509'
        }
        console.log("putting data into wallet")
        await wallet.put(blockchainConst.caAdmin, data);
        console.log('Successfully enrolled admin user and imported it into the wallet');
    } catch (error) {
        console.error(`Failed to enroll admin user : ${error}`);
    }
};


exports.userExist = async(wallet, userId) => {
    console.log("userExist: wallet path", wallet)
    const identity = await wallet.get(userId);
    if (!identity) {
        throw new Error("Identity not exist ")
    }
    return true;
}