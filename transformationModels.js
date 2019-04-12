"use strict";
/**
 * Represents a Transformation Modal ( ExportTransformModel )
 * This is what is ultimately sent to DB
 * @property {bool} IsDeleted
 * @property {int} TransformID
 * @property {string} OutputColumn
 * @property {string} FindValue
 * @property {string} RuleType
 * @property {string} ActionValue
 */
function TransformationExport(dataObj) {
    if (arguments.length === 0) {
        console.error("TransformationExport: A data object must be provided.")
        return;
    }
    // if (Object.keys(dataObj).length !== 6 || Object.keys(dataObj).length  6) {
    //     console.error("TransformationExport: All data properties must be populated.")
    // }
    this.IsDeleted = dataObj.IsDeleted;
    // trasnformID comes from DB. use if sent, if a new one, assign it to 0
    this.TransformID = dataObj.TransformID;
    // the output column
    this.OutputColumn = dataObj.OutputColumn;
    // for Replace, give value . for calculate give null
    this.FindValue = dataObj.FindValue;
    // "replace", "multiply", "add"
    this.RuleType = dataObj.RuleType;
    // for Calculate, "multiply by" field, for replace "Change" field
    this.ActionValue = dataObj.ActionValue;    
}

Object.defineProperty(TransformationExport, "RuleTypes", {
    value: {
        "Replace": "replace",
        "Add": "add",
        "Multiply": "multiply"
    },
    enumerable: false,
    writable: false
});

/**
 * Class for TransformationElements (the blocks in the transformation container)
 * @param {string} type - Indicates the type of transformation. Use TransformationElement.Types to indicate
 * @param {string} message - This message will display between the icon and cancel button
 * @param {number} sessionID - The id assigned by the given transformer. Used when canceling a transformation
 * @param {TransformationExport} tExport
 * @property {TransformationExport} transformationExport
 */
function TransformationElement(type, message, sessionID, tExport) {
    var _this = this;
    if (!type) {
        console.error("TransformationElement: Type must be provided");
    }

    this.transformationExport = null;
    if (tExport) {
        this.transformationExport = tExport;
    }
    this.id = TransformationElement.id();
    this.type = type;
    this.sessionID = sessionID;
    this.modal = null;
    var imageURL = "/Content/Images/";
    this.icon = imageURL + (this.type === TransformationElement.Types.Replace ? "PFL_FindReplace.png" : "PFL_Calculate.png" );

    this.message = message;
    this.element = this.createTemplate(this.message);

    this.undoButton = this.element.querySelector(".retailer__transformation--undo");
    this.undoButton.addEventListener("click", function() {
        // If from DB
        if (_this.transformationExport.TransformID !== 0) {
            // Edit export to send back as deleted
            _this.transformationExport.IsDeleted = true;
        } else {
            // Remove the transformation from being sent to DB
            TransformationExportService.removeByID(_this.sessionID);
        }
        // Unregister transformation tokens from history
        TransformationHistory.undoByID(sessionID);
        TransformationHistory.eraseByID(_this.sessionID);

        // Trigger removal from the transformation dashboard
        Events.emit("remove-transformationElement", {
            element: _this
        });
    });

    this.element.addEventListener("click", function(){
        // if (_this.type === "replace") {
        //     $(RetailerExportPage.Instance.findReplaceButton).click();
        // } else {
        //     $(RetailerExportPage.Instance.calculateButton).click();
        // }
        
    });

    console.log(this);
}
/**
 * Static properties that indicate a transformation type
 */
TransformationElement.Types = {
    Replace: "replace",
    Calculate: "calculate"
}
/**
 * Given a string message, this will generate an HTMLElement for the
 * transformation
 * @param {string} message
 * @returns {HTMLDivElement} element
 */
TransformationElement.prototype.createTemplate = function(message) {
    var template = "";

    // Container
    template += `<div class='retailer__transformation' data-sessionID='${this.sessionID}'>`;
        // Icon
        template += "<span class='retailer__transformation--icon'>"
            template += `<img src='${this.icon}' />`;
        template += "</span>"

        // Transformation info
        template += `<span class='retailer__transformation--info'>${message}</span>`;

        // Close/Undo button
        template += "<span class='retailer__transformation--undo'>"
            template += "<i class='fa fa-times'></i>";
        template += "</span>"
    // End Container
    template += "</div>";
    return $(template)[0];
}

TransformationElement.fromTransformationExport = function(it, sessionID) {
    var newElementMessage = TransformationElement.generateMessage(it);
    return new TransformationElement(it.RuleType, newElementMessage, sessionID, it);
}

/**
 * Generates the innert text of a TransformationElement
 * @param {TransformationExport} tExport
 */
TransformationElement.generateMessage = function(tExport) {
    var preposition = tExport.RuleType === "replace" ? "to" : "by";
    var newElementMessage = null;
    if (tExport.RuleType === "replace") {
        newElementMessage = `${tExport.RuleType} "${tExport.FindValue}" ${preposition} "${tExport.ActionValue}" In ${tExport.OutputColumn}`;
    } else if (tExport.RuleType === "multiply") {
        newElementMessage = `${tExport.RuleType} ${preposition} "${tExport.ActionValue}" In ${tExport.OutputColumn}`;
    } else {
        newElementMessage = `${tExport.RuleType} "${tExport.ActionValue}" To ${tExport.OutputColumn}`;
    }
    return newElementMessage;
}

/**
 * @returns {funciton} number
 */
TransformationElement.id = (function () {
    var count = 0;
    return function () {
        return ++count;
    }
}());
