
'use strict';

/**************************************************************************
 **************************************************************************
 **************************************************************************
 * 
 * All CRUD Operations of Trade And LC Records
 * 
 **************************************************************************
 **************************************************************************
 */


/*************************************************************************
 * 
 * Globals : Trade And LC Objects
 * 
*************************************************************************/

var trade_Object = {
    Trade_Id: "",
    Buyer: "",
    Seller: "",
    Shipment: "",
    ShipmentCount: "",
    Amount: "",
    Current_Status: ""
};

var lc_Object = {
    Trade_Id: "",
    Lc_Id: "",
    Buyer: "",
    Seller: "",
    Seller_Id: "",
    Bank: "",
    Shipment: "",
    ShipmentCount: "",
    Amount: "",
    Expiry_Date: "",
    Request_Location: "",
    Current_Status: ""
};

var bDebug = false;

var HelperUtilsModule = require('./HelperUtils');
var mongoDbCrudModule = require('./MongoDbCRUD');

/**************************************************************************
 **************************************************************************
 **************************************************************************
 * 
 * Trade and LC record : CRUD operation Wrappers Module
 *                       DB Specific User Input/Output processing
 * 
 **************************************************************************
 **************************************************************************
 */


/**
 * 
 * @param {any} recordObjectMap  : Map of <K,V> Pairs from Client Request ( Trade Record )
 * 
 */

function prepareTradeDocumentObject(recordObjectMap) {

    // Replace the "URL Space" with regular space in Record Object Map Values

    recordObjectMap = HelperUtilsModule.removeUrlSpacesFromMapValues(recordObjectMap);

    // Remove "Starting & Trailing Spaces" from Record Object Map Values

    recordObjectMap = HelperUtilsModule.removeStartingAndTrailingSpacesFromMapValues(recordObjectMap);

    // Prepare Trade Object for MongoDB consumption

    trade_Object._id = recordObjectMap.get("Trade_Id");
    trade_Object.Trade_Id = recordObjectMap.get("Trade_Id");
    trade_Object.Buyer = recordObjectMap.get("Buyer");
    trade_Object.Seller = recordObjectMap.get("Seller");
    trade_Object.Shipment = recordObjectMap.get("Shipment");
    trade_Object.ShipmentCount = recordObjectMap.get("ShipmentCount");
    trade_Object.Amount = recordObjectMap.get("Amount");
    trade_Object.Current_Status = "Trade_Requested";
}

/**
 * 
 * @param {any} recordObjectMap  : Map of <K,V> Pairs from Client Request ( LC Record )
 * 
 */

function prepareLcDocumentObject(recordObjectMap) {

    // Replace the "URL Space" with regular space in Record Object Map Values

    recordObjectMap = HelperUtilsModule.removeUrlSpacesFromMapValues(recordObjectMap);

    // Remove "Starting & Trailing Spaces" from Record Object Map Values

    recordObjectMap = HelperUtilsModule.removeStartingAndTrailingSpacesFromMapValues(recordObjectMap);

    // Prepare LC Object for MongoDB consumption

    // Same Record gets modified after Trade Creation ( _id shouldn't be changed )

    lc_Object.Trade_Id = recordObjectMap.get("Trade_Id");
    lc_Object.Lc_Id = recordObjectMap.get("Lc_Id");
    lc_Object.Buyer = recordObjectMap.get("Buyer");
    lc_Object.Seller = recordObjectMap.get("Seller");
    lc_Object.Seller_Id = recordObjectMap.get("Seller_Id");
    lc_Object.Bank = recordObjectMap.get("Bank");
    lc_Object.Shipment = recordObjectMap.get("Shipment");
    lc_Object.ShipmentCount = recordObjectMap.get("ShipmentCount");
    lc_Object.Amount = recordObjectMap.get("Amount");
    lc_Object.Expiry_Date = recordObjectMap.get("Expiry_Date");
    lc_Object.Request_Location = recordObjectMap.get("Request_Location");
    lc_Object.Current_Status = "LC_Requested";
}


/**
 * 
 * @param {any} dbConnection  : Connection to database
 * @param {any} collectionName  : Name of Table ( Collection )
 * @param {any} recordObjectMap : Map of <K,V> Pairs ( Record ), to be added to Shipment Database : Trade And LC Table
 * @param {any} requiredDetailsCollection : required keys for record addition ( Trade & LC )
 * @param {any} bLcRequest : "LC Request" R "Trade Request" ? 
 * 
 */

exports.addTradeAndLcRecordToDatabase = function (dbConnection, collectionName, recordObjectMap, requiredDetailsCollection, bLcRequest) {

    // Check if all the required fields are present before adding the record

    for (var i = 0; i < requiredDetailsCollection.length; i++) {

        var currentKey = requiredDetailsCollection[i];

        if (recordObjectMap.get(currentKey) == null) {

            console.error("addTradeAndLcRecordToDatabase : Value corresponding to required Key doesn't exist => Required Key : " + currentKey);
            return false;
        }
    }

    // Prepare Trade | LC Document Objects and add them to Shipment Database

    if (!bLcRequest) {

        prepareTradeDocumentObject(recordObjectMap);

        console.log("addTradeAndLcRecordToDatabase : All <K,V> pairs are present, Adding Trade Record of Num Of Pairs => " + trade_Object.length);

        // Remove spaces from trade_object values before adding to MongoDB

        trade_Object = HelperUtilsModule.removeUrlSpacesFromObjectValues(trade_Object);
        addRecordToTradeAndLcDatabase(dbConnection,
            collectionName,
            trade_Object);

    } else {

        prepareLcDocumentObject(recordObjectMap);

        console.log("addTradeAndLcRecordToDatabase : All <K,V> pairs are present, Adding LC Record of Num Of Pairs => " + lc_Object.length);

        // Remove spaces from lc_Object values before adding to MongoDB

        lc_Object = HelperUtilsModule.removeUrlSpacesFromObjectValues(lc_Object);
        addRecordToTradeAndLcDatabase(dbConnection,
            collectionName,
            lc_Object);
    }

    return true;
}


/**
 * 
 * @param {any} dbConnection  : Connection to database 
 * @param {any} collectionName  : Name of Table ( Collection )
 * @param {any} document_Object : Document object to be added ( Record, Row in Table )
 * 
 */

function addRecordToTradeAndLcDatabase(dbConnection, collectionName, document_Object) {

    // Update if Present ; Add Otherwise

    var query = null;

    console.log("addRecordToTradeAndLcDatabase => collectionName :" + collectionName + " Trade_Identifier :" + document_Object.Trade_Id + " Lc_Identifier :" + document_Object.Lc_Id);

    if (document_Object.Trade_Id != null) {

        query = { Trade_Id: document_Object.Trade_Id };
    }
    else if (document_Object.Lc_Id != null) {

        query = { Lc_Id: document_Object.Lc_Id };
    }

    if (query) {

        dbConnection.collection(collectionName).findOne(query, function (err, result) {

            if (err) {

                console.log("addRecordToTradeAndLcDatabase : Error while querying for document to be inserted");
                throw err;
            }

            var recordPresent = (result) ? "true" : "false";
            if (recordPresent == "false") {

                // Record Addition

                console.log("Record Not Found, Adding New Record => " + " Trade Id : " + document_Object.Trade_Id + " LC Id : " + document_Object.Lc_Id);
                mongoDbCrudModule.directAdditionOfRecordToDatabase(dbConnection, collectionName, document_Object);
            }
            else {

                // Record Updation

                console.log("Record Found, Updating the existing Record => " + " Trade Id : " + document_Object.Trade_Id + " LC Id : " + document_Object.Lc_Id);
                mongoDbCrudModule.directUpdationOfRecordToDatabase(dbConnection, collectionName, document_Object, query);
            }

        });

    } else {

        // Record Addition

        console.log("Both Trade_Id and Lc_Id are null in input Object, Adding New Record without primary keys");
        mongoDbCrudModule.directAdditionOfRecordToDatabase(dbConnection, collectionName, document_Object);
    }

}


/**
 * 
 * @param {any} dbConnection  : Connection to database 
 * @param {any} collectionName  : Name of Table ( Collection )
 * @param {any} clientRequestWithParamsMap : input Map consisting of Query Details ( "Trade_Id, Lc_Id" )
 * @param {any} statusToBeUpdated : status of the Record to be update
 * @param {any} http_response : Http Response to be built based on the record updation
 * 
 */

exports.updateRecordStatusInTradeAndLcDatabase = function (dbConnection, collectionName, clientRequestWithParamsMap, webClientRequest, statusToBeUpdated, http_response) {

    var tradeId = clientRequestWithParamsMap.get("Trade_Id");
    var lcId = clientRequestWithParamsMap.get("Lc_Id");

    console.log("updateRecordStatusInTradeAndLcDatabase : Updating the status : " + statusToBeUpdated + " => Trade_Id: " + tradeId + ", Lc_Id: " + lcId);

    var query_Object = { Trade_Id: tradeId, Lc_Id: lcId };
    var document_Object = {
        $set: { Current_Status: statusToBeUpdated }
    };

    updateRecordInTradeAndLcDatabase(dbConnection,
        collectionName,
        query_Object,
        document_Object,
        webClientRequest,
        http_response);

    console.log("Web Service: Switch Statement : Successfully launched the update Record with status : " + statusToBeUpdated + " => Trade_Id: " + tradeId + ", Lc_Id: " + lcId);
}

/**
 * 
 * @param {any} dbConnection  : Connection to database 
 * @param {any} collectionName  : Name of Table ( Collection )
 * @param {any} query_Object : Query object to retrieve the corresponding Record ( Record, Row in Table )
 * @param {any} document_Object : Document object that needs to be updated ( Record, Row in Table )
 * 
 */

function updateRecordInTradeAndLcDatabase(dbConnection, collectionName, query_Object, document_Object, webClientRequest, http_response) {

    // Find Record & Update

    var query = null;

    console.log("updateRecordInTradeAndLcDatabase => collectionName :" + collectionName + " Trade_Identifier :" + query_Object.Trade_Id + " Lc_Identifier :" + query_Object.Lc_Id);

    if (query_Object.Trade_Id != null) {

        query = { Trade_Id: query_Object.Trade_Id };

    } else if (query_Object.Lc_Id != null) {

        query = { Lc_Id: query_Object.Lc_Id };

    } else {

        var failureMessage = "Wrong Query/missing input data : Couldn't find Record";
        buildErrorResponse_ForRecordUpdation(failureMessage, webClientRequest, http_response);

        return;
    }

    // Update Record in DB

    dbConnection.collection(collectionName).updateOne(query, document_Object, function (err, result) {

        if (err) {

            var failureMessage = "Error while executing the updation on Record";
            buildErrorResponse_ForRecordUpdation(failureMessage, webClientRequest, http_response);
            throw err;
        }

        var recordPresent = (result == null || result == undefined) ? "false" : "true";
        if (recordPresent == "false") {

            // Record Not Found : Return Error Response

            console.error("Record Not Found => For Trade Id : " + query_Object.Trade_Id + " LC Id : " + query_Object.Lc_Id);
            var failureMessage = "Record Updation: Record not found for Trade_Id : " + query_Object.Trade_Id + " LC Id : " + query_Object.Lc_Id;
            buildErrorResponse_ForRecordUpdation(failureMessage, webClientRequest, http_response);

        }
        else {

            // Record Updation Successful

            console.log("Record Found, Updated the Record with latest Status => " + " Trade Id : " + query_Object.Trade_Id + " LC Id : " + query_Object.Lc_Id);
            var successMessage = "Record Found, Updated the Record with latest Status => " + " Trade Id : " + query_Object.Trade_Id + " LC Id : " + query_Object.Lc_Id;
            buildSuccessResponse_ForRecordUpdation(successMessage, webClientRequest, http_response);
        }

    });

}


/**
 * 
 * @param {any} failureMessage  : Failure Message Error Content
 * @param {any} http_response : Http Response thats gets built
 * 
*/

function buildErrorResponse_ForRecordUpdation(failureMessage, webClientRequest, http_response) {

    // Build error Response for Record Updation

    var recordUpdationResponseObject = null;

    recordUpdationResponseObject = { Request: webClientRequest, Status: failureMessage };
    var recordUpdationResponse = JSON.stringify(recordUpdationResponseObject);

    http_response.writeHead(400, { 'Content-Type': 'application/json' });
    http_response.end(recordUpdationResponse);
}

/**
 * 
 * @param {any} successMessage  : Success Message Content
 * @param {any} http_Response : Http Response thats gets built
 * 
*/

function buildSuccessResponse_ForRecordUpdation(successMessage, webClientRequest, http_response) {

    // Build success Response for Record Updation

    var recordUpdationResponseObject = null;

    recordUpdationResponseObject = { Request: webClientRequest, Status: successMessage };
    var recordUpdationResponse = JSON.stringify(recordUpdationResponseObject);

    http_response.writeHead(200, { 'Content-Type': 'application/json' });
    http_response.end(recordUpdationResponse);
}

/**
 * 
 * @param {any} queryResult : query Result from mongo DB
 * 
 * @returns {any} queryResponse_JSON : Trade Record in JSON format
 * 
 */

function buildTradeRecord_JSON(queryResult) {

    var queryResponse_JSON = null;

    queryResult = HelperUtilsModule.removeUrlSpacesFromObjectValues(queryResult);

    queryResponse_JSON = {
        "Trade_Id": queryResult.Trade_Id, "Buyer": queryResult.Buyer, "Seller": queryResult.Seller, "Shipment": queryResult.Shipment,
        "ShipmentCount": queryResult.ShipmentCount, "Amount": queryResult.Amount, "Current_Status": queryResult.Current_Status
    };

    return queryResponse_JSON;
}


/**
 * 
 * @param {any} queryResult : query Result from mongo DB
 * 
 * @returns {any} queryResponse_JSON : LC Record in JSON format
 * 
*/

function buildLcRecord_JSON(queryResult) {

    var queryResponse_JSON = null;

    queryResult = HelperUtilsModule.removeUrlSpacesFromObjectValues(queryResult);

    queryResponse_JSON = {
        "Trade_Id": queryResult.Trade_Id, "Lc_Id": queryResult.Lc_Id, "Buyer": queryResult.Buyer, "Seller": queryResult.Seller,
        "Seller_Id": queryResult.Seller_Id, "Bank": queryResult.Bank, "Shipment": queryResult.Shipment, "Amount": queryResult.Amount,
        "ShipmentCount": queryResult.ShipmentCount, "Current_Status": queryResult.Current_Status, "Expiry_Date": queryResult.Expiry_Date,
        "Request_Location": queryResult.Request_Location
    };

    return queryResponse_JSON;
}


/**
 * 
 * @param {any} err  : Error returned to callback function
 * @param {any} result  : Database Query Result ( List of Records : 1 - n )
 * @param       req  : Web Client Request
 * @param       res  : Reponse To be built
 * @param {any} queryType  : Type of Query Result ( SingleTradeRecord, SingleLcRecord, AllRecords ) to be processed
 *
 */

exports.handleQueryResults = function (err, queryResult, req, res, queryType) {

    if (err) {
        console.log("Error in executing Retrieval Query : ");
        throw err;
    }

    console.log("Callback Function (handleQueryResults) : Successfully retrieved the records through function (mongoDbCrudModule.retrieveRecordFromTradeAndLcDatabase) => ");
    console.log(queryResult);

    var queryResponse_JSON_String = buildQueryResponse_JSON(queryResult, queryType);

    // Build Success Response with Query Results

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(queryResponse_JSON_String);
}


/**
 * 
 * @param {any} queryResult  : query Response received from Mongo DB
 * @param {any} queryType  : query Type for which JSON Response has to be built
 *
 */

function buildQueryResponse_JSON(queryResult, queryType) {

    var queryResponse_JSON = null;

    if (queryType == "SingleTradeRecord") {

        return JSON.stringify(buildTradeRecord_JSON(queryResult));

    } else if (queryType == "SingleLcRecord") {

        return JSON.stringify(buildLcRecord_JSON(queryResult));

    } else {

        var queryResponse_AllRecords_JSON_String = "";

        for (var i = 0; i < queryResult.length; i++) {

            if (queryResult[i].Lc_Id != null && queryResult[i].Lc_Id != undefined) {

                queryResponse_AllRecords_JSON_String += JSON.stringify(buildLcRecord_JSON(queryResult[i]));
                queryResponse_AllRecords_JSON_String += "\n";

            } else {

                queryResponse_AllRecords_JSON_String += JSON.stringify(buildTradeRecord_JSON(queryResult[i]));
                queryResponse_AllRecords_JSON_String += "\n";
            }

        }

        return queryResponse_AllRecords_JSON_String;
    }

    return queryResponse_JSON;
}

