var TemplateName = (function () {
    var element = document.querySelector(".retailerExport__header--templateName"),
        h3 = element.querySelector("h3"),
        form = element.querySelector("form");

    var editButton = element.querySelector(".retailerExport__header--editName");

    function toggleh3andForm() {
        [form, h3].forEach(function (el) {
            el.classList.toggle("show");    
        });
        
    }

    return {
        init: function () {
            h3.classList.add("show");
            editButton.addEventListener("click", function () {
                toggleh3andForm();
            });
        }
    };
}());
