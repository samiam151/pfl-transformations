"use strict";
/**
 * Service to control the UI part of finding and replacing
 * @property {Iterator} results
 * @property {FindReplaceModal} modal
 */
function FinderAndReplacer(modal) {
    this.modal = modal;
    this.inputValue = null;
    this.columns = null;
    this.column = null;
    this.results = null;
    this.replaceValue = null;
    this.columnValue = null;
    this.activeField = null;
    this.sessionID = SessionIDFactory();
    this.updateMap = {
        "column": "column",
        "input": "inputValue",
        "replace": "replaceValue"
    }
}

FinderAndReplacer.prototype.init = function () {
    this.inputValue = this.modal.findInput.value;
    this.column = this.modal.columnField.value;
    this.replaceValue = this.modal.replaceWithInput.value;
    this.columns = RetailerExportPage.ColumnMap;
}

FinderAndReplacer.prototype.update = function (field, value) {
    this[this.updateMap[field]] = value;
    if (field === "column" || field === "input") {
        this.genResults();
    }
}

FinderAndReplacer.prototype.genResults = function () {
    var _this = this;
    var cols = this.columns[this.column].filter(function (col) {
        return col.innerHTML.toUpperCase().includes(_this.inputValue.toUpperCase());
    });
    this.results = new Iterator(cols);
}

FinderAndReplacer.prototype.retrieveResults = function () {
    var _this = this;
    var cols = this.columns[this.column].filter(function (col) {
        return col.innerHTML.toUpperCase().includes(_this.inputValue.toUpperCase());
    });
    return new Iterator(cols);
}

FinderAndReplacer.prototype.highlightNextField = function () {
    // Unhighlight the current elemnt 
    TransformationUI.unhighlight(this.activeField);

    if (this.inputValue || this.modal) {
        if (!this.results || (this.results.source.length === 0)) {
            this.genResults();
        }
        var nextResult = this.results.next();
        TransformationUI.highlight(nextResult);

        // Update the active element
        this.activeField = nextResult;
    }
}

FinderAndReplacer.prototype.replaceInput = function () {
    if (!this.activeField) {
        this.highlightNextField();
    }

    // Store the "before" state
    var cachingObj = {};
    cachingObj["before"] = this.activeField.innerHTML;
    cachingObj["element"] = this.activeField;
    cachingObj["session"] = this.sessionID;
    cachingObj["status"] = TransformationHistory.Stati.Unsaved;
    cachingObj["hidden"] = false;

    // Change the value
    var regex = new RegExp(this.inputValue, "gi");
    this.activeField.innerHTML = this.activeField.innerHTML.replace(regex, this.replaceValue);

    // Permanently highlight the field
    TransformationUI.highlightPermanent(this.activeField);

    // Store the "after" state
    cachingObj["after"] = this.activeField.innerHTML;
    TransformationHistory.add(cachingObj);
    this.genResults();
}

/**
 * @return {number} number of reows effected
 */
FinderAndReplacer.prototype.replaceAllInput = function() {
    var _this = this;

    // Change the value
    var regex = new RegExp(this.inputValue, "gi");
    var rows_iterator = this.retrieveResults();
    var rowLength = rows_iterator.source.length;

    rows_iterator.source.forEach(function(row){
        // Store the "before" state
        var cachingObj = {};
        cachingObj["before"] = row.innerHTML;
        cachingObj["element"] = row;
        cachingObj["sessionID"] = _this.sessionID;
        cachingObj["status"] = TransformationHistory.Stati.Unsaved;
        row.innerHTML = row.innerHTML.replace(regex, _this.replaceValue);
        
        // Permanently highlight the field
        TransformationUI.highlightPermanent(row);

        // Store the "after" state
        cachingObj["after"] = row.innerHTML;

        var ttoken = new TransformationToken().updateUsingObject(cachingObj);
        TransformationHistory.add(ttoken);
    });

    return rowLength;
}

FinderAndReplacer.prototype.reset = function () {
    var _this = this;
    TransformationUI.unhighlight(this.activeField);
    this.activeField = null;

    // Clear unsaved transformations
    var unsavedTransformations = TransformationHistory.getByID(_this.sessionID);
    unsavedTransformations.forEach(function (t) {
        t.element.innerHTML = t.before;
        TransformationUI.unhighlightPermanent(t.element);
    });
}


/**
 * 
 * @param {CalculateModal} modal 
 */
function Calculator(modal) {
    this.modal = modal;
    this.columns = RetailerExportPage.ColumnMap;
    this.selectedColumn = null;
    this.selectedFunction = null;
    this.selectedMultiplier = null;
    this.sessionID = SessionIDFactory();
}

Calculator.prototype.init = function (modal) {
    this.selectedColumn = this.modal.columnField.value;
    this.selectedFunction = this.modal.functionField.value;
    this.selectedMultiplier = this.modal.byField.value;
}

Calculator.prototype.setSelectedFunction = function (newValue) {
    this.selectedFunction = newValue;
}

Calculator.prototype.setSelectedMultiplier = function (newValue) {
    this.selectedMultiplier = newValue;
}

Calculator.prototype.setColumn = function (newValue) {
    this.selectedColumn = newValue;
}

/**
 * @returns {number} number of reows affected
 */
Calculator.prototype.calculate = function () {
    if (!this.selectedColumn) console.error("Calculator: There must be a column selected.");
    if (!this.selectedMultiplier) console.error("Calculator: There must be a multiplier value.");
    if (!this.selectedFunction) console.error("Calculator: There must be a function selected.");

    return this.performCalculation();
}

/**
 * @returns {number} count - Returns number of transformations done
 */
Calculator.prototype.performCalculation = function () {
    var _this = this;
    // Change the values
    var rows = this.columns[this.selectedColumn];
    rows.forEach(function (row) {

        // Store the "before" state
        var cachingObj = {};
        cachingObj["before"] = row.innerHTML;
        cachingObj["element"] = row;
        cachingObj["sessionID"] = _this.sessionID;
        cachingObj["status"] = TransformationHistory.Stati.Unsaved;
        cachingObj["hidden"] = false;

        // Perform transformation
        var before = +row.innerHTML,
            after = null;
        if (_this.selectedFunction === "Multiply") {
            after = before * +_this.selectedMultiplier;
        }
        if (_this.selectedFunction === "Add") {
            after = before + (+_this.selectedMultiplier);
        }
        row.innerHTML = after;

        // Store the after state
        cachingObj["after"] = row.innerHTML;

        var ttoken = new TransformationToken().updateUsingObject(cachingObj);
        TransformationHistory.add(ttoken);

        // Hightlight element
        TransformationUI.highlight(row);
    });

    return rows.length;
}

Calculator.prototype.reset = function () {
    var _this = this;
    // Clear unsaved transformations
    var unsavedTransformations = TransformationHistory.getByID(_this.sessionID);
    unsavedTransformations.forEach(function (t) {
        t.element.innerHTML = t.before;
        TransformationUI.unhighlight(t.element);
        TransformationUI.unhighlightPermanent(t.element);
    });
}