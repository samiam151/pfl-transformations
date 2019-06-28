/// <reference path="./RetailerExport/utilities.js" />
/// <reference path="./RetailerExport/transformationModels.js" />
"use strict";
//#region HOW THIS WORKS
/**
 * HOW THIS THING WORKS
 * ==================================== 
 * 
 * IMPORTANT TOPICS:
 * Describes the intent behind the program, and some of the terms I'll throw around or use a lot.
 * 
 *      TRANSFORMATION TOKENS:
 *      A TransformationToken describes an action that is taken, and indicates its state.
 *      When in a modal and you click "Replace" / "Add" / "Multiply", the desired action is taken on every affected element.
 *      For each one of these actions (replace "this text" to "that text", muiltiply "this" by "that" for example), a 
 *      TransofrmationToken is created and added to the TransformationHistory service.
 * 
 *      Each TransformationToken has a sessionID. Every time a modal is opened, a new TransformationModal instnace is created,
 *      which, in turn, creates a new "transformer" (Calculator or FinderAndReplacer). Each transformer assigns itself a sessionID (SessionIDFactory),
 *      which is passed to the TransformationToken. This is how a set of actions is identified.
 * 
 *      For example: 
 *      One opens the Calculate modal, chooses their parameters, then presses Multiply. For every row in the selected column,
 *      a new TransformationToken is logged, each with the same sessionID. 
 * 
 *      Now, in the above scenario, the "Save" button has not been pressed. In this state, all the created TransformationTokens
 *      have a status of "unsaved". This is so that, if one closes the modal before saving, they can be undone with little consequence.
 *      Only when the "Save" button is clicked do that stati change to "saved".
 * 
 *      RETAILEREXPORT
 *      This class (there's only one instace) controls the page-level elements. It adds listeners to the modal triggers,
 *      the "Show Transformation" toggle, and holds the shown TransformationElements in the the container. Also, confers to
 *      the TransformationExportService when it's time to save all changes made.
 * 
 *      TRANSFORMATION MODALS:
 *      As stated above, every time a modal is triggered (opened), a new TransformationModal instance is created.
 *      The TransformationModal class is the base class, and CalculateModal and FindReplaceModal inherit from it.
 *      The modal instances only register event listeners for their buttons and respond to changes in their inputs.
 *      When a input is changed or button is pressed, it's transformer (Calculator or FinderAndReplacer) is notified and 
 *      updated. For all intents and purposes, it's a dumb modal that keeps the state of nothing. The heavy lifting is done by the
 *      transformer.
 * 
 *      The only meaningful method (action) for the modal is for the "Save" button. This method creates TransformationExport
 *      that gets added to the TransformationExportService, changes the status of the TransformationTokens with the same sessionID
 *      to "saved", then creates a TransformationELement for the transformation.
 * 
 *      TRANSFORMERS (Calculator or FinderAndReplacer):
 *      The transformers do the heavy lifting when running transformations. There are two, and they do some things differently.
 *      However, both receive updates as to changes in the modal, and keeps state of the values. Also, its in the transformer where
 *      the TransformationTokens are created and sent to the log. The also coordinate highlighting elements, using the TransformationUI
 *      service.
 * 
 *          FINDERANDREPLACER
 *          The FinderAndReplacer is defferent in that it can operate on a single element of a column, as well as operate on the whole
 *          column. How this is orchestrated is described below.
 *      
 *          The ReplaceAll button can run on it's own, given the find and replace inputs are populated.
 *          The single replace and find buttons has something to do with each other, though. You cannot replace unless a element is 
 *          selected, and the find button is whats selects it.
 *          When you hit the "Find Next" button is clicked, results are generated int he form of an Iterator (see \Scripts\utils\utils.js).
 *          The first result becomes the selected field. Now you can replace. Hit "Find Next" again, the next item becomes selected, and the previous
 *          item is removed from the results Iterator. When the results run out, the results are generated again and the process starts over.
 *  
 *          CALCULATOR
 *          The Calculator, by design, only operates on entire columns. So if you want to change the Price, you do it on all prices.
 *          Like the FinderandReplacer, its values are updated by methods called form the modal. By the time the Calculate button is clicked,
 *          all form field values are known, so this just changes the values and highlights. This is done in the "performCalculation" method.
 * 
 * 
 * HOW TRANSFORMATIONS ARE REPRESENTED
 * The idea of a transformation has to be realized in a few different ways. Below are all the ways we represent them.
 * 
 *      TRANSFORMATIONTOKENS
 *      As covered above, these are registered actions taken. 
 *      
 *      TRANSFORMATIONELEMENTS
 *      These are the blocks that appear in the container, below the modal trigger buttons.
 *      They don't do anything but show up, but you can cancel/remove a transformation using the Cancel button.
 * 
 *      TRANSFORMATIONEXPORTS
 *      This is the way the database understands a transformation. When the "ultimate" save button is pressed, it's these
 *      that get sent, and when the page is loaded, it's these that are supplied to the View page.
 * 
 *      TRANSFORMATIONEXPORTSOBJECTS
 *      These are TRANSFORMATIONEXPORTS wrapped with a sessionID. We use these to avoid having the database to keep track of
 *      the sessionIDs', which only the FE requires.
 * 
 * 
 * SERVICES USED FOR FUN AND PROFIT
 *      TRANSFORMATIONUI
 *      This does the actual hightlighting and unhighlighting of elements. It keeps no states, so you have to supply an elements to
 *      it's methods. This also has methods to hide the transformation container.
 * 
 *      TRANSFORMATIONHISTORY
 *      Tons of methods, all JSDOC'd. This service keeps track of all the actions taken, it holds all the TransformationTokens created.
 *      One thing to note of the difference between UNDOING and ERASING. They're done separately, as needed. 
 *          
 *          UNDOING a transformation changes the elements "after" (or current) state to it's "before" state, and unhightlight it (using the
 *          TransformationUI service). This is done, for instance, when the Show Transformations toggle switches off. The changes are undone,
 *          but they still exist for when you switch it back. There, the current value is changed to the "after" value.
 * 
 *          ERASING a transformation removes it from the log; it never happened.
 * 
 *      TRANSFORMATIONEXPORTSERVICE
 *      This keeps track of the TransformationExports, and contains the method that ultimately send the request that saves them
 *      in the database.
 *      Note that when adding a transformation, it must be of type TransformationExportObject (described above).
 * 
 *      SESSIONIDFACTORY
 *      This is a single function closure that creates a unique sessionID. Because they are needed by both transformers, and when 
 *      importing transformations on page load, there has to be an uninterested way to get an ID that is unique across all services.
 *      In short, if you need a sessionID, use this. Very important.
 */
//#endregion

function _inherits(child, parent) {
    child.prototype = Object.create(parent.prototype);
    child.prototype.constructor = child;
    child.prototype.super = parent.prototype;
}

/**
 * Holds the state of transformation, creates views for transformations
 * @property {Transformation[]} transformations - Current transformations
 * @param {HTMLTableHeaderCellElement[]} headers - Correleate to export fields
 */
function RetailerExportPage() {
    var _this = this;
    RetailerExportPage.Instance = this;
    this.element = document.querySelector(".retailerExport");
    this.table = this.element.querySelector(".retailerExport__table");
    if (!this.element || !this.table) return;
    RetailerExportPage.TemplateID = this.element.dataset.templateid;
    this.data = this.getTransformationData();
    this.transformations = [];
    this.transformationContainer = this.element.querySelector(".retailerExport--transformations");
    this.saveButton = this.element.querySelector(".retailerExport__actions--save");
    this.toggleTransformations = this.element.querySelector(".retailerExport--showTransformations input");

    // Collect data from View
    //TO-DO: Break these out into separate, unconcerned, module
    this.transformationDataFromDB = JSON.parse(document.querySelector("#retailerExport--transformationData").innerHTML);
    this.applicableFieldsData = JSON.parse(document.querySelector("#retailerExport--applicableFieldsData").innerHTML);

    // Get all columns into a map
    // Key = Name, Value = td's for that Name
    var headers = Array.from(this.element.querySelectorAll(".retailerExport__table th"));
    this.headers = headers.map(function (header) {
        return header.dataset.name;
    });
    
    // Save the column map in the static property, and also set it on the FinderAndReplacer service.
    RetailerExportPage.ColumnMap = this.headers.reduce(function (columns, name) {
        var cols = Array.from(_this.element.querySelectorAll("[data-name='" + name + "']"));
        // Skip the first block, this is the column header.
        columns[name] = cols.splice(1);
        return columns;
    }, {});

    
    // Add listeners to the modal triggers
    this.findReplaceButton = this.element.querySelector(".retailerExport__actions [data-target='#findReplace']");
    this.findReplaceButton.addEventListener("click", function(){
        new FindReplaceModal(document.querySelector("#findReplace"), _this.headers, _this.applicableFieldsData.forFindReplace);
    });
    
    this.calculateButton = this.element.querySelector(".retailerExport__actions [data-target='#calculate']");
    this.calculateButton.addEventListener("click", function(){
        new CalculateModal(document.querySelector("#calculate"), _this.headers, _this.applicableFieldsData.forCalculate);
    });
    
    // Add new transformations to the Transformacion Container
    Events.subscribe("new-transformationElement", (function(data){
        this.addTransformationElement(data.element);
    }).bind(this));
    
    // Remove transformations to the Transformacion Container
    Events.subscribe("remove-transformationElement", (function(data) {
        var element = data.element;
        var el = this.transformations.find(function(t){
            return t.sessionID === element.sessionID;
        });
        this.transformations = this.transformations.filter(function(t){
            return t.sessionID !== el.sessionID;
        });
        this.transformationContainer.removeChild(el.element);
    }).bind(this));

    // Import transformations from DB
    if (this.transformationDataFromDB.length) {
        this.transformationDataFromDB.forEach(function(t){
            var it = new TransformationExport(t);
            var sessionID = SessionIDFactory();
            
            // Register transformations in History
            this.processTransformationFromDB(it, sessionID);
    
            // Add Transformation Elements
            this.addTransformationElement(TransformationElement.fromTransformationExport(it, sessionID));

            // Register the TransformationExport
            TransformationExportService.addTransformation(
                new TransformationExportObject(sessionID, it)
            );
        }, this);
    }

    // Listener to toggle transformations
    this.toggleTransformations.addEventListener("change", function(e){
        if (e.target.checked) {
            TransformationHistory.reapplyAll();
            TransformationUI.showTransformationElements();
            
        } else {
            TransformationHistory.undoAll();
            TransformationUI.hideTransformationElements();
        }
    });

    // Add lister for the "ultimate" save
    this.saveButton.addEventListener("click", function(e) {
        e.preventDefault();
        TransformationExportService.sendTransformationsForExport();
    });

    console.log(this);
}

/**
 * Registers TransformationTokens created for the export information, then highlights active fields
 * @param {TransformationExport} _transformationExport
 * @param {number} sessionID
 */
RetailerExportPage.prototype.processTransformationFromDB = function(_transformationExport, sessionID) {
    // Register transformations in History
    var selectedColumn = RetailerExportPage.ColumnMap[_transformationExport.OutputColumn];
    selectedColumn.forEach(function(column){
        var ttoken = new TransformationToken();
        ttoken.before = column.innerHTML;
        ttoken.element = column;
        ttoken.sessionID = sessionID;
        ttoken.status = "saved";
        ttoken.hidden = "false";

        switch (_transformationExport.RuleType) {
            case "replace":
                // Perform transformation
                var regex = new RegExp(_transformationExport.FindValue, "gi");
                var newHTML = column.innerHTML.replace(regex, _transformationExport.ActionValue);
                column.innerHTML = newHTML;
                // Store the token after property
                ttoken.after = newHTML;
                break;
                
            case "add":
                // Perform transformation
                var toAdd = _transformationExport.ActionValue;
                var newValue = (+column.innerHTML + +toAdd);
                column.innerHTML = newValue;
                
                // Store the token after property
                ttoken.after = newValue;
                break;

            case "multiply":
                // Perform transformation
                var toMultiply = _transformationExport.ActionValue;
                var newValue = (+column.innerHTML * +toMultiply);
                column.innerHTML = newValue;
                
                // Store the token after property
                ttoken.after = newValue;
                break;

            default:
                break;
        }

        // Register and hightlight changes that are "actually" changes
        if (ttoken.before !== ttoken.after) {
            TransformationHistory.add(ttoken);
            TransformationUI.highlightPermanent(column);
        }
    });
}

RetailerExportPage.prototype.addTransformationElement = function(_transformationElement) {
    this.transformations.push(_transformationElement);
    this.transformationContainer.appendChild(_transformationElement.element);
}

RetailerExportPage.prototype.getTransformationData = function () {
    var dataElement = document.querySelector("#retailerExport--transformationData");
    return JSON.parse(dataElement.innerHTML);
}

/**
 * Static property for TemplateID
 */
Object.defineProperty(RetailerExportPage, "TemplateID", {
    value: null,
    enumerable: false,
    writable: true
});
/**
 * Static property for ColumnMap
 */
Object.defineProperty(RetailerExportPage, "ColumnMap", {
    value: null,
    enumerable: false,
    writable: true
});
/**
 * Static property for current RetailerExportPage instance
 */
Object.defineProperty(RetailerExportPage, "Instance", {
    value: null,
    enumerable: false,
    writable: true
});
