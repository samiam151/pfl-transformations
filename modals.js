/// <reference path="../../utils/utils.js" />
"use strict";
/**
 * Base class for all transformation modals
 * @param {HTMLElement} element - Modal container element
 * @param {HTMLTableHeaderCellElement[]} headers - Correleate to export fields
 * @param {HTMLSelectElement} columnField
 */
function TransformationModal(element, headers) {
    var _this = this;
    this.element = element;
    this.columnField = this.element.querySelector(".tfm-columns");
    this.resultsInfo = this.element.querySelector(".resultsInfo");
    this.bootstrapEvents = {
        open: "shown.bs.modal",
        close: "hide.bs.modal",
        loaded: "loaded.bs.modal"
    };

    // Populate headers and columns in the modal
    this.headers = headers;
    if(_this.columnField.children.length === 1) {
        headers.forEach(function (header) {
            $(_this.columnField).append($("<option value='" + header + "'>" + header + "</option>")[0]);
        });
    }

    // Save and Cancel buttons
    this.cancelButton = this.element.querySelector(".tfm-cancel");
    TransformationModal.Instances.push(this);
    console.log(this);
}
/**
 * @abstract
 */
TransformationModal.prototype.save = function () {
    console.error("TransformationModal: This method bust be overwritten.");
}

TransformationModal.prototype.close = function () {
    $(this.element).modal("hide");
}

Object.defineProperty(TransformationModal, "Instances", {
    value: [],
    enumerable: false,
    writable: true
});

/**
 * Modal for doing the Calculate transformations
 * @extends TransformationModal
 * @param {*} element 
 * @param {*} headers 
 */
function CalculateModal(element, headers, applicableFields) {
    var _this = this;
    TransformationModal.call(this, element, headers);
    // this.transformation = new CalculateTransformation();
    this.functionField = this.element.querySelector(".tfm-calculateFunctions");
    this.byField = this.element.querySelector(".tfm-calculateBy");
    this.calculateButton = this.element.querySelector(".calculate--perform");
    this.saveButton = this.element.querySelector(".tfm-save");
    this.resultsInfoDiv = this.element.querySelector(".resultsInfo");
    this.cachedResults = null;
    // Create a new Calculator transformer
    this.transformer = new Calculator(this);
    this.transformer.init();

    this.applicableFields = applicableFields;
    Array.from(this.columnField.children).forEach((option, index) => {
        if (!this.applicableFields.includes(option.value) && index !== 0) {
            $(option).remove();
        }
    });

    function functionChange(e) {
        _this.transformer.setSelectedFunction(e.target.value);

        // Update the text in the Calculate button
        _this.calculateButton.innerHTML = e.target.value;
    }
    function byChange(e) {
        _this.transformer.setSelectedMultiplier(+e.target.value);
    }
    function columnChange(e) {
        _this.transformer.setColumn(e.target.value);
    }
    function calculate() {
        var rowsEffected = _this.transformer.calculate();
        //var verb = this.functionField === "multiply" ? "multiplied" : "added";
        var message = "You've calculated " + "<b>" + rowsEffected + " items." + "</b>";
        _this.resultsInfoDiv.innerHTML = message;
    }

    // Add listeners for value changes
    this.functionField.addEventListener("change", functionChange);
    this.byField.addEventListener("change", byChange);
    this.columnField.addEventListener("change", columnChange);
    this.calculateButton.addEventListener("click", calculate);

    function saveButtonEL() {
        _this.save();
    }
    this.saveButton.addEventListener("click", saveButtonEL);

    var cancelButtonEL = (function() {
        if (this.transformer) {
            this.transformer.reset();
        }
        TransformationHistory.undoByID(this.transformer.sessionID);
        TransformationHistory.eraseByID(this.transformer.sessionID);
        this.close();
    }).bind(this);
    this.cancelButton.addEventListener("click", cancelButtonEL);

    // Remove listeners when the modal closes
    $(this.element).on(_this.bootstrapEvents.close, function () {
        _this.cacheResults();
        if (_this.transformer) {
            TransformationHistory.undoUnsavedByID(_this.transformer.sessionID);
            TransformationHistory.eraseUnsavedByID(_this.transformer.sessionID);
        }
        _this.functionField.removeEventListener("change", functionChange);
        _this.byField.removeEventListener("change", byChange);
        _this.calculateButton.removeEventListener("click", calculate);
        _this.columnField.removeEventListener("change", columnChange);
        _this.saveButton.removeEventListener("click", saveButtonEL);
        _this.cancelButton.removeEventListener("click", cancelButtonEL);
        _this.resultsInfoDiv.innerHTML = "";
        _this.transformer = null;

        _this.resetInputs();
    });
}
_inherits(CalculateModal, TransformationModal);

CalculateModal.prototype.cacheResults = function() {
    this.cachedResults = {
        transformer: this.transformer,
        byField: this.byField.value,
        functionField: this.functionField.value,
        columnField: this.columnField.value
    }
}

CalculateModal.prototype.resetInputs = function () {
    this.byField.value = "";
    this.functionField.value = null;
    this.columnField.value = null;
}

/**
 * Finalizes a transformation by 1) Creating a TransformationExportObject to send to DB,
 * 2) saves all transformations performed in the TransformationHistory, and 3) creates a
 * transformation element to be displayed in the dashboard.
 * Finally, this closes the modal.
 */
CalculateModal.prototype.save = function () {
    var func = this.functionField.value;

    if (this.byField.value) {
        // Form the TransformationExport
        var t = {};
        t.TransformID = 0;
        t.RuleType = TransformationExport.RuleTypes[func];
        t.OutputColumn = this.columnField.value;
        t.FindValue = null;
        t.ActionValue = this.byField.value;
        t.IsDeleted = false;

        var tExport = new TransformationExport(t);
        TransformationExportService.addTransformation(
            new TransformationExportObject( this.transformer.sessionID, t)
        );

        // Save transformations in TransformationHistory
        TransformationHistory.saveByID(this.transformer.sessionID);

        // Create TransformationElement
        // var message = this.functionField.value + " " + this.columnField.value + " by " + this.byField.value;
        // var message = `${this.functionField.value} "${this.byField.value}" In ${this.columnField.value}`;
        var message = TransformationElement.generateMessage(tExport);
        var el = new TransformationElement(
            TransformationElement.Types.Calculate, 
            message, 
            this.transformer.sessionID, 
            tExport
        );
        el.modal = this;
        Events.emit("new-transformationElement", {
            element: el,
            modal: this
        });
    }
    // Close the modal
    this.close();
}

/**
 * Modal for doing the Find and Replace transformations
 * @extends TransformationModal
 * @param {*} element 
 * @param {*} headers 
 */
function FindReplaceModal(element, headers, applicableFields) {
    var _this = this;
    TransformationModal.call(this, element, headers);

    this.id = FindReplaceModal.id();
    this.findInput = this.element.querySelector(".tfm-find");
    this.replaceWithInput = this.element.querySelector(".tfm-replaceWith");
    this.findNextButton = this.element.querySelector(".replace--findNext");
    this.replaceButton = this.element.querySelector(".replace--replace");
    this.replaceAllButton = this.element.querySelector(".replace--replaceAll");
    this.saveButton = this.element.querySelector(".tfm-save");
    this.resultsInfoDiv = this.element.querySelector(".resultsInfo");
    this.cachedResults = null;
    this.transformer = new FinderAndReplacer(this);
    this.transformer.init();

    this.applicableFields = applicableFields;
    // Array.from(this.columnField.children).forEach((option, index) => {
    //     if (!this.applicableFields.includes(option.value) && index !== 0) {
    //         $(option).remove();
    //     }
    // });

    // Create separate handler `functions so we can remove the listeners when
    // the modal closes
    function findInputEL(e) {
        _this.transformer.update("input", e.target.value);
    }
    function columnFieldEL(e) {
        _this.transformer.update("column", e.target.value);
    }
    function replaceInputEL(e) {
        _this.transformer.update("replace", e.target.value);
    }
    function findNextEL() {
        _this.transformer.highlightNextField();
    }
    function replaceButtonEL() {
        _this.transformer.replaceInput();

        var message = "You've replaced <b>1 item.</b>";
        _this.resultsInfoDiv.innerHTML = message;
    }

    function replaceAllEL() {
        var rowsEffected = _this.transformer.replaceAllInput();
        var message = "You've replaced " + "<b>" + rowsEffected + " items." + "</b>";
        _this.resultsInfoDiv.innerHTML = message;
    }

    // Update the transformer info when info changes
    this.findInput.addEventListener("change", findInputEL);
    this.columnField.addEventListener("change", columnFieldEL);
    this.replaceWithInput.addEventListener("change", replaceInputEL);

    // Respond to user actions for finding and replacing
    this.findNextButton.addEventListener("click", findNextEL);
    this.replaceButton.addEventListener("click", replaceButtonEL);
    this.replaceAllButton.addEventListener("click", replaceAllEL);
    function saveButtonEL() {
        _this.save();
    }
    this.saveButton.addEventListener("click", saveButtonEL);

    var cancelButtonEL = (function() {
        if (this.transformer) {
            this.transformer.reset();
        }
        TransformationHistory.undoByID(this.transformer.sessionID);
        TransformationHistory.eraseByID(this.transformer.sessionID);
        this.close();
    }).bind(this);
    this.cancelButton.addEventListener("click", cancelButtonEL);

    // When the modal closes...
    $(this.element).on(_this.bootstrapEvents.close, function () {
        _this.cacheResults();
        if (_this.transformer) {
            TransformationHistory.undoUnsavedByID(_this.transformer.sessionID);
            TransformationHistory.eraseUnsavedByID(_this.transformer.sessionID);
        }
        _this.findInput.removeEventListener("change", findInputEL);
        _this.columnField.removeEventListener("change", columnFieldEL);
        _this.replaceWithInput.removeEventListener("change", replaceInputEL);
        _this.findNextButton.removeEventListener("click", findNextEL);
        _this.replaceButton.removeEventListener("click", replaceButtonEL);
        _this.replaceAllButton.removeEventListener("click", replaceAllEL);
        _this.saveButton.removeEventListener("click", saveButtonEL);
        _this.cancelButton.removeEventListener("click", cancelButtonEL);
        _this.resultsInfoDiv.innerHTML = "";
        _this.clearInputs();
        _this.transformer = null;

        _this.clearInputs();
    });
}
_inherits(FindReplaceModal, TransformationModal)

FindReplaceModal.prototype.cacheResults = function() {
    this.cachedResults = {
        transformer: this.transformer,
        findInput: this.findInput.value,
        replaceWithInput: this.replaceWithInput.value,
        columnField: this.columnField.value
    }
}

FindReplaceModal.prototype.clearInputs = function () {
    [this.columnField, this.findInput, this.replaceWithInput].forEach(function (f) {
        f.value = "";
    });
}

/**
 * Finalizes a transformation by 1) Creating a TransformationExportObject to send to DB,
 * 2) saves all transformations performed in the TransformationHistory, and 3) creates a
 * transformation element to be displayed in the dashboard.
 */
FindReplaceModal.prototype.save = function () {
    if (this.replaceWithInput.value) {
        var hasAnyTransformations = TransformationHistory.getByID(this.transformer.sessionID).toBoolean();

        // Form the Transformation
        var t = {};
        t.TransformID = 0;
        t.RuleType = TransformationExport.RuleTypes.Replace;
        t.OutputColumn = this.columnField.value;
        t.FindValue = this.findInput.value;
        t.ActionValue = this.replaceWithInput.value;
        t.IsDeleted = false;

        var tExport = new TransformationExport(t);
        TransformationExportService.addTransformation(
            new TransformationExportObject(
                this.transformer.sessionID,
                tExport
            )
        );

        // Save transformations in TransformationHistory
        if (hasAnyTransformations) {
            TransformationHistory.saveByID(this.transformer.sessionID);
        } else {
            this.transformer.replaceAllInput();
            TransformationHistory.saveByID(this.transformer.sessionID);
        }

        // Create TransformationElement
        // var message = 'Replace "' + this.findInput.value + '" for "' + this.replaceWithInput.value + '" in ' + this.columnField.value;
        var message = TransformationElement.generateMessage(tExport);
        var el = new TransformationElement(
            TransformationElement.Types.Replace, 
            message, 
            this.transformer.sessionID,
            tExport
        );
        el.modal = this;
        Events.emit("new-transformationElement", {
            element: el,
            modal: this
        });

    }

    // Close the modal
    this.close();
}

FindReplaceModal.id = (function () {
    var i = 0;
    return function () {
        i += 1;
        return i;
    }
}());