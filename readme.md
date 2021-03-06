HOW THIS THING WORKS
==================================== 

IMPORTANT TOPICS:
Describes the intent behind the program, and some of the terms I'll throw around or use a lot.

     TRANSFORMATION TOKENS:
     A TransformationToken describes an action that is taken, and indicates its state.
     When in a modal and you click "Replace" / "Add" / "Multiply", the desired action is taken on every affected element.
     For each one of these actions (replace "this text" to "that text", muiltiply "this" by "that" for example), a 
     TransofrmationToken is created and added to the TransformationHistory service.

     Each TransformationToken has a sessionID. Every time a modal is opened, a new TransformationModal instnace is created,
     which, in turn, creates a new "transformer" (Calculator or FinderAndReplacer). Each transformer assigns itself a sessionID (SessionIDFactory),
     which is passed to the TransformationToken. This is how a set of actions is identified.

     For example: 
     One opens the Calculate modal, chooses their parameters, then presses Multiply. For every row in the selected column,
     a new TransformationToken is logged, each with the same sessionID. 

     Now, in the above scenario, the "Save" button has not been pressed. In this state, all the created TransformationTokens
     have a status of "unsaved". This is so that, if one closes the modal before saving, they can be undone with little consequence.
     Only when the "Save" button is clicked do that stati change to "saved".

     RETAILEREXPORT
     This class (there's only one instace) controls the page-level elements. It adds listeners to the modal triggers,
     the "Show Transformation" toggle, and holds the shown TransformationElements in the the container. Also, confers to
     the TransformationExportService when it's time to save all changes made.

     TRANSFORMATION MODALS:
     As stated above, every time a modal is triggered (opened), a new TransformationModal instance is created.
     The TransformationModal class is the base class, and CalculateModal and FindReplaceModal inherit from it.
     The modal instances only register event listeners for their buttons and respond to changes in their inputs.
     When a input is changed or button is pressed, it's transformer (Calculator or FinderAndReplacer) is notified and 
     updated. For all intents and purposes, it's a dumb modal that keeps the state of nothing. The heavy lifting is done by the
     transformer.

     The only meaningful method (action) for the modal is for the "Save" button. This method creates TransformationExport
     that gets added to the TransformationExportService, changes the status of the TransformationTokens with the same sessionID
     to "saved", then creates a TransformationELement for the transformation.

     TRANSFORMERS (Calculator or FinderAndReplacer):
     The transformers do the heavy lifting when running transformations. There are two, and they do some things differently.
     However, both receive updates as to changes in the modal, and keeps state of the values. Also, its in the transformer where
     the TransformationTokens are created and sent to the log. The also coordinate highlighting elements, using the TransformationUI
     service.

         FINDERANDREPLACER
         The FinderAndReplacer is defferent in that it can operate on a single element of a column, as well as operate on the whole
         column. How this is orchestrated is described below.
     
         The ReplaceAll button can run on it's own, given the find and replace inputs are populated.
         The single replace and find buttons has something to do with each other, though. You cannot replace unless a element is 
         selected, and the find button is whats selects it.
         When you hit the "Find Next" button is clicked, results are generated int he form of an Iterator (see \Scripts\utils\utils.js).
         The first result becomes the selected field. Now you can replace. Hit "Find Next" again, the next item becomes selected, and the previous
         item is removed from the results Iterator. When the results run out, the results are generated again and the process starts over.
 
         CALCULATOR
         The Calculator, by design, only operates on entire columns. So if you want to change the Price, you do it on all prices.
         Like the FinderandReplacer, its values are updated by methods called form the modal. By the time the Calculate button is clicked,
         all form field values are known, so this just changes the values and highlights. This is done in the "performCalculation" method.


HOW TRANSFORMATIONS ARE REPRESENTED
The idea of a transformation has to be realized in a few different ways. Below are all the ways we represent them.

     TRANSFORMATIONTOKENS
     As covered above, these are registered actions taken. 
     
     TRANSFORMATIONELEMENTS
     These are the blocks that appear in the container, below the modal trigger buttons.
     They don't do anything but show up, but you can cancel/remove a transformation using the Cancel button.

     TRANSFORMATIONEXPORTS
     This is the way the database understands a transformation. When the "ultimate" save button is pressed, it's these
     that get sent, and when the page is loaded, it's these that are supplied to the View page.

     TRANSFORMATIONEXPORTSOBJECTS
     These are TRANSFORMATIONEXPORTS wrapped with a sessionID. We use these to avoid having the database to keep track of
     the sessionIDs', which only the FE requires.


SERVICES USED FOR FUN AND PROFIT
     TRANSFORMATIONUI
     This does the actual hightlighting and unhighlighting of elements. It keeps no states, so you have to supply an elements to
     it's methods. This also has methods to hide the transformation container.

     TRANSFORMATIONHISTORY
     Tons of methods, all JSDOC'd. This service keeps track of all the actions taken, it holds all the TransformationTokens created.
     One thing to note of the difference between UNDOING and ERASING. They're done separately, as needed. 
         
         UNDOING a transformation changes the elements "after" (or current) state to it's "before" state, and unhightlight it (using the
         TransformationUI service). This is done, for instance, when the Show Transformations toggle switches off. The changes are undone,
         but they still exist for when you switch it back. There, the current value is changed to the "after" value.

         ERASING a transformation removes it from the log; it never happened.

     TRANSFORMATIONEXPORTSERVICE
     This keeps track of the TransformationExports, and contains the method that ultimately send the request that saves them
     in the database.
     Note that when adding a transformation, it must be of type TransformationExportObject (described above).

     SESSIONIDFACTORY
     This is a single function closure that creates a unique sessionID. Because they are needed by both transformers, and when 
     importing transformations on page load, there has to be an uninterested way to get an ID that is unique across all services.
     In short, if you need a sessionID, use this. Very important.
