/// <reference path="./transformationModels.js" />
"use strict";
/**
 * Utility methods for UI changes regarding transformations
 */
var TransformationUI = (function () {
    /**
     * Temporarily highlights an element
     * Adds CSS class "highlighted"
     * @param {HTMLElement} element 
     */
	function highlight(element) {
		if (element) {
			element.classList.add("highlighted");
			return element;
		}
	}
    /**
     * "Permanently" highlights an element
     * Adds CSS class "highlighted--permanent"
     * @param {HTMLElement} element 
     */
	function highlightPermanent(element) {
		if (element) {
			element.classList.add("highlighted--permanent");
			return element;
		}
	}
    /**
     * Temporarily highlights an element
     * Removes CSS class "highlighted"
     * @param {HTMLElement} element 
     */
	function unhighlight(element) {
		if (element) {
			element.classList.remove("highlighted");
			return element;
		}
	}
    /**
     * "Permanently" highlights an element
     * Removes CSS class "highlighted--permanent"
     * @param {HTMLElement} element 
     */
	function unhighlightPermanent(element) {
		if (element) {
			element.classList.remove("highlighted--permanent");
			return element;
		}
	}

	function hideTransformationElements() {
		$(RetailerExportPage.Instance.transformationContainer).hide();
	}

	function showTransformationElements() {
		$(RetailerExportPage.Instance.transformationContainer).show();
	}

	return {
		highlight: highlight,
		highlightPermanent: highlightPermanent,
		unhighlight: unhighlight,
		unhighlightPermanent: unhighlightPermanent,
		hideTransformationElements: hideTransformationElements,
		showTransformationElements: showTransformationElements
	}
}());

/**
 * Service to keep track up transformation tokens and their status
 * @property {TransformationToken[]} transformations
 */
var TransformationHistory = (function () {
	var transformations = [];

	return {
        /**
         * Add a transformation to the history
         * @param {TransformationToken} t 
         */
		add: function (t) {
			transformations.push(t);
			// console.log("TransformationHistory: transformations", transformations);
		},
        /**
         * Clear all transformations for history
         */
		clear: function () {
			transformations = [];
		},
        /**
         * Erase all transformations matching a given sessionID
         * @param {number} sessionID 
         */
		eraseByID: function (sessionID) {
			transformations = transformations.filter(function (t) {
				return t.sessionID !== sessionID;
			});
		},
        /**
         * Erase all UNSAVED transformations matching a given sessionID
         * @param {number} sessionID 
         */
		eraseUnsavedByID: function (sessionID) {
			// var unsavedandid = transformations.filter(function(t){
			//     return t.sessionID === sessionID && t.status === "unsaved";
			// });
			transformations = transformations.filter(function (t) {
				// return !unsavedandid.includes(t);
				if (t.sessionID !== sessionID) {
					return true;
				}
				return t.status !== "unsaved";
			});
		},
        /**
         * Retrieve all stored transformations
         * @returns {TransformationToken[]}
         */
		getAll: function () {
			return transformations;
		},
        /**
         * Retrieve all stored transformations matching a given sessionID
         * @param {number} sessionID 
         * @returns {TransformationToken[]}
         */
		getByID: function (sessionID) {
			return transformations.filter(function (t) {
				return t.sessionID === sessionID;
			}).sort(function (a, b) {
				return a.session > b.session;
			});
		},
        /**
         * Used to re-visualize stored transformations
         */
		reapplyAll: function () {
			transformations.forEach(function (t) {
				var element = t.element;
				element.innerHTML = t.after;
				TransformationUI.highlight(element);
				TransformationUI.highlightPermanent(element);
				t.hidden = false;
			});
		},
        /**
         * Changes the status of transformations matching the given sessionID
         * to "saved". This prevents it from being deleted when the modal is 
         * closed or canceled.
         * @param {number} sessionID 
         */
		saveByID: function (sessionID) {
			// var ts = transformations.filter(function (t) {
			//     return t.sessionID === sessionID;
			// });
			// ts.forEach(function(t){
			//     if (t.status === "unsaved") {
			//         t.status === "saved";
			//     }
			// });
			transformations.forEach(function (t) {
				if (t.sessionID === sessionID) {
					if (t.status === "unsaved") {
						t.status = "saved";
					}
				}
			});
		},
        /**
         * Visually hide all transformations. This does not delete them
         * from record.
         */
		undoAll: function () {
			transformations.forEach(function (t) {
				var element = t.element;
				element.innerHTML = t.before;
				TransformationUI.unhighlight(element);
				TransformationUI.unhighlightPermanent(element);
				t.hidden = true;
			});
		},
        /**
         * Visually hide all transformations matching the given sessionID.
         * This does not delete them from record.
         * @param {number} sessionID
         */
		undoByID: function (sessionID) {
			var ts = transformations.filter(function (t) {
				return t.sessionID === sessionID;
			});

			// Determine whether or not to unhighlight the element, based on whether there are
			// other active transformations on the column
			var tExport = TransformationExportService.getExportByID(sessionID);
			var areOtherTransformationsOnThisColumn = null;
			if (tExport) {
				var activeColumns = TransformationExportService.getTransformationsForExport()
					.filter(function (t) {
						return !t.IsDeleted;
					})
					.map(function (t) {
						return t.OutputColumn;
					});
				var activeColumnsWithSameColumn = activeColumns.filter(function (column) {
					return column === tExport.transformationExport.OutputColumn;
				});
				// var areOtherTransformationsOnThisColumn = (activeColumnsWithSameColumn.length > 1);
				var areOtherTransformationsOnThisColumn = activeColumnsWithSameColumn.includes(tExport.transformationExport.OutputColumn);
			} else {
				areOtherTransformationsOnThisColumn = false;
			}

			ts.forEach(function (t) {
				var element = t.element;
				element.innerHTML = t.before;

				if (!areOtherTransformationsOnThisColumn) {
					TransformationUI.unhighlight(element);
					TransformationUI.unhighlightPermanent(element);
				}
			});
		},
        /**
         * Visually hide all UNSAVED transformations matching the given sessionID.
         * This does not delete them from record.
         * @param {number} sessionID
         */
		undoUnsavedByID: function (sessionID) {
			var ts = transformations.filter(function (t) {
				return t.sessionID === sessionID && t.status === "unsaved";
			});
			ts.forEach(function (t) {
				var element = t.element;
				element.innerHTML = t.before;
				TransformationUI.unhighlight(element);
				TransformationUI.unhighlightPermanent(element);
			});
		}
	}
}());
Object.defineProperty(TransformationHistory, "Stati", {
	value: {
		Unsaved: "unsaved",
		Saved: "saved"
	}
});

/**
 * Token object that any represents an action taken, whether saved or unsaved.
 * Actions include Calculate or Replace transformations
 */
function TransformationToken() {
	this.element = null;
	this.sessionID = null;
	this.status = null;
	this.before = null;
	this.after = null;
}
TransformationToken.prototype.updateUsingObject = function (obj) {
	if (obj.hasOwnProperty("before")) this.before = obj.before;
	if (obj.hasOwnProperty("after")) this.after = obj.after;
	if (obj.hasOwnProperty("status")) this.status = obj.status;
	if (obj.hasOwnProperty("sessionID")) this.sessionID = obj.sessionID;
	if (obj.hasOwnProperty("element")) this.element = obj.element;
	return this;
}

/**
 * Utility mehtod for creating SessionID's
 * @returns {function}
 * */
var SessionIDFactory = (function () {
	var index = 1000;
	return function () {
		index += 1;
		return index;
	}
}());

/**
 * Service to hold transformtaions to send to DB
 * @property {TransformationExportObject} TransformationExportService.transformations
 */
var TransformationExportService = (function () {
	var transformations = [];
	var submitURL = "/Export/SaveTransformations";

	return {
        /**
         * Register a transformation for DB sending
         * @param {TransformationExportObject} t 
         */
		addTransformation: function (t) {
			if (t.constructor.name !== "TransformationExportObject") {
				console.error("TransformationExportService: Must provide a TransformationExportObject");
				return;
			}
			transformations.push(t);
		},
        /**
         * @returns {TransformationExportObject[]}
         */
		getAll: function () {
			return transformations;
		},
        /**
         * Retrieves a TransformationExport by a given sessionID
         * @returns {TransformationExportObject}
         * @param {number} sessionID
         */
		getExportByID: function (sessionID) {
			return transformations.find(function (t) {
				return t.sessionID === sessionID;
			});
		},
        /**
         * Retrieve all regeistered transformations that
         * will be sent to DB
         * @returns {TransformationExport[]}
         */
		getTransformationsForExport: function () {
			return transformations.map(function (t) {
				return t.transformationExport;
			});
		},
        /**
         * Remove a registers transformation by it's sessionID
         * @param {number} sessionID
         */
		removeByID: function (sessionID) {
			transformations = transformations.filter(function (t) {
				return t.sessionID !== sessionID;
			});
		},
        /**
         * Send all registered transformations to DB
         */
		sendTransformationsForExport: function () {
			var _transformations = transformations.map(function (f) {
				return f.transformationExport;
			});

			if (_transformations.length) {
				$.ajax({
					type: "POST",
					url: submitURL,
					data: {
						"templateID": RetailerExportPage.TemplateID,
						"tforms": _transformations
					}
				})
                .done(function (data, textStatus, jqxhr) {
                    console.log(textStatus);
                    var successModal = document.querySelector("#ajaxSuccess");
                    $(successModal).modal("show");

                    setTimeout(function () {
                        window.location.pathname = "/Export/ExportTemplates";
                    }, 1000);
                })
                .fail(function (jqxhr, textStatus, message) {
                    console.log(textStatus);
                    var failureModal = document.querySelector("#ajaxFailure");
                    var failureModalContent = failureModal.querySelector("#ajaxFailure .ajaxFailure--content");
                    var errorContent = jqxhr.statusText;//$(jqxhr.responseText)[11];
                    failureModalContent.innerHTML = errorContent.replace(/"/g, "");//errorContent.textContent;
                    $(failureModal).modal("show");
                });
			} else {
				var exitModal = document.querySelector("#saveWIthoutTransformations");
				$(exitModal).modal("show");
			}
		}
	}
}());

/**
 * 
 * @param {number} sessionID 
 * @param {TransformationExport} _transformationExport 
 */
function TransformationExportObject(sessionID, _transformationExport) {
	this.sessionID = sessionID;
	this.transformationExport = _transformationExport;
}