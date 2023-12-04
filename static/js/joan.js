import {Part} from "./part.js"
import {Node} from "./node.js"
import {Plate} from "./plate.js"
import {Fastener} from "./fastener.js"
import {Constraint} from "./constraint.js"
import {Load} from "./load.js"
import {Material} from "./material.js"

(function() {
    $(document).ready(() => {
        // Tables
        const partTableBody = $('.table-parts tbody');
        const nodeTableBody = $('.table-nodes tbody');
        const plateTableBody = $('.table-plates tbody');
        const fastTableBody = $('.table-fasteners tbody');
        const reactTableBody = $('.table-reactions tbody');
        const loadTableBody = $('.table-loads tbody');

        // Data from DB
        let materialsDB = `[
            {
                "name": "2024",
                "ht": "T3",
                "E": 10300000
            },
            {
                "name": "7075",
                "ht": "T6",
                "E": 10500000
            },
            {
                "name": "user defined",
                "ht": "",
                "E": 10000000
            }
        ]`;
        let materials = JSON.parse(materialsDB);
        console.log(materials);

        $('#input-material-datalist').autocomplete();
        $('#input-alloy-datalist').autocomplete();
        $('#input-spec-datalist').autocomplete();
        $('#input-form-datalist').autocomplete();
        $('#input-ht-datalist').autocomplete();

        const chooseMaterialFromDB = $('.material-from-DB');
        const defineMaterialByUser = $('.material-user-defined');
        const saveMaterial = $('#save-material');
        const modalMaterialInputs = $('.modal-body input');
        const modal = $('.modal');
        let materialsArray = [];
        let material = null;
        let target;
        let part = null;

        chooseMaterialFromDB.on('click', function(e) {
            $(e.target).parents('ul').prev().text($(e.target).text());
            target = $(e.target);
            for (let input of modalMaterialInputs) {
                $(input).val('').css({'border-color': 'unset'});
            };
        });

        const partsBlock = $('.parts');

        saveMaterial.on('click', function(event) {
            event.stopPropagation();
            material = new Material;
            let rowIndex = null;
            Array.from(modalMaterialInputs).forEach(item => {
                const labelText = $(item).prev().text().trim();
                const spaceIndex = labelText.indexOf(' ');
                if (spaceIndex > -1) {
                    const prop = labelText.slice(spaceIndex + 1).replace(' ', '_');
                    material[prop] = $(item).val();
                }
            });
            if (material.alloy && material.heat_treatment) {
                console.log(target);
                console.log(target.parent());
                console.log(target.parents('tr'));
                console.log(findRowIndex(target.parents('tr')[0],partTableBody));
                rowIndex = findRowIndex(target.parents('tr')[0],partTableBody);
                target.parent().parent().parent().parent().next().text(`${material.material} ${material.alloy}-${material.heat_treatment} ${material.form} ${material.specification}`);
            }
            const partMaterial = materials.find(item => item.name === material.alloy && item.ht === material.heat_treatment);
            if (partMaterial) {
                target.parent().parent().parent().parent().next().next().text(partMaterial.E);
                material.E = partMaterial.E;
            } else {
                target.parent().parent().parent().parent().next().next().text('').attr('contenteditable', true);
            }
            materialsArray.push(material);
//            addMaterialCaption(material, rowIndex);
            target = null;
            console.log(materialsArray);

            function addMaterialCaption(material, index) {
                const caption = $(document.createElement('div'));
                caption.text(`(${index + 1}) ${material.material} ${material.alloy}-${material.heat_treatment} ${material.form} ${material.specification}, E = ${material.E}`);
                caption.css('font-size', '12px');
                partsBlock.append(caption);
            }
        });

        modalMaterialInputs.on('change', (e) => {
            if ($(e.target).val()) {
                $(e.target).css({'border-color': 'green'});
            } else {
                $(e.target).css({'border-color': 'red'});
            }
        });


        defineMaterialByUser.on('click', (e) => {
            $(e.target).parents('ul').prev().text($(e.target).text());
            $(e.target).parents('td')[0].nextElementSibling.setAttribute('contenteditable', true);
            $(e.target).parents('td')[0].nextElementSibling.nextElementSibling.setAttribute('contenteditable', true);
        });

        partTableBody.find('.col3').on('input',() => {

        })


        let fastenersDB = `[
            {"name": "BACR15GF","type": "rivet","subtype": "solid", "nomDia": 5,"Ebb": 10300000,"Gb": 4000000},
            {"name": "BACB15VU","type": "bolt","subtype": "protruding", "nomDia": 6,"Ebb": 16000000,"Gb": 6150000}
        ]`;
        let fasteners = JSON.parse(fastenersDB);



        let parts = document.getElementsByClassName('part');

        const materialSelect = $('.material-select');
        const fastenerSelect = $('.fastener-select');

        const creationMode = $('#creation-mode');
        const partSelection = $('#part-selection');
        const deletionMode = $('#deletion-mode');
        const createInput = $('#creation-mode-radio');
        const deleteInput = $('#deletion-mode-radio');

        const canvas = document.getElementById('canvas');
        const canvasWidth = 600;
        const canvasHeight = 300;
        const ctx = canvas.getContext('2d');
        canvas.setAttribute('width', canvasWidth);
        canvas.setAttribute('height', canvasHeight);

        const defaultSpacing = 0.750;
        const spacingTableCells = document.querySelectorAll('.table-spacings tbody .col2');
        let spacingArray = Array(spacingTableCells.length);
        spacingArray.fill(defaultSpacing);

        part = null;
        let node = null;
        let plate = null;
        let fastener = null;
        let constraint = null;
        let load = null;
        let partsArray = [];
        let nodesArray = [];
        let platesArray = [];
        let fastArray = [];
        let constraintsArray = [];
        let loadsArray = [];

        let node1 = null;
        let node2 = null;

        let col = null;
        let row = null;
        let coord = null;
        let index = null;

        Array.from(partTableBody.children()).forEach(item => {
            part = new Part;
            part.name = $(item).children()[0].innerText;
            partsArray.push(part);
        });

        console.log(partTableBody.children());


        // Добавляем/удаляем парты по выбранному значению в селекте
        $('#parts-amount').on('change', ((e) => {
            let currentPartsAmount = document.getElementsByClassName('part').length;
            let addParts = $(e.target).val() - currentPartsAmount;
            if (addParts > 0) {
                for (let i = 0; i < addParts; i++) {
                    addPartAtTableAndSelection();
                }
            } else {
                for (let i = 0; i < Math.abs(addParts); i++) {
                    partTableBody.children().last().remove();
                    partSelection.children().last().remove();
                    partsArray.pop();
                }
            }
        }));



        //
        fastenerSelect.on('change', (e) => {
            const fastRow = $(e.target).parents('tr');
            const fastenerType = fastRow.find('.col2 select').val();
            const fastenerPN = $(e.target).val();
            const fastenerNomDia = fastRow.find('.col4 select').val();
            const fastener = fasteners.find(item => item.name === fastenerPN && item.nomDia === +fastenerNomDia && item.type === fastenerType);
            if (fastener) {
                $(e.target).parent().next().next().text((fastenerNomDia / 32).toFixed(3));
                const fastenerDia = $(e.target).parent().next().next().text();
                const fastRow = $($(e.target).parent()[0]).parent()[0];
                const fastSpacing = $(e.target).parent().siblings('.col7').text();
                const index = Array.from(fastTableBody.children()).indexOf(fastRow);
                if (fastArray[index]) {
                    addFastenerProp(index, ['type', fastenerType], ['partNumber', fastenerPN], ['nomDia', fastenerNomDia], ['fastDia', fastenerDia],
                    ['Ebb', fastener.Ebb], ['Gb', fastener.Gb], ['spacing', fastSpacing]);
                }
            } else {
                $(e.target).parent().next().next().text('');
            }
        });

        fastTableBody.find('.col3').on('input', (e) => {
            const rowIndex = findRowIndex($(e.target).parent('tr')[0], fastTableBody);
            fastArray[rowIndex].partNumber = +$(e.target).text();
        });

        fastTableBody.find('.col4').on('input', (e) => {
            const rowIndex = findRowIndex($(e.target).parent('tr')[0], fastTableBody);
            fastArray[rowIndex].nomDia = +$(e.target).text();
        });

        fastTableBody.find('.col5').on('input', (e) => {
            const rowIndex = findRowIndex($(e.target).parent('tr')[0], fastTableBody);
            fastArray[rowIndex].fastDia = +$(e.target).text();
        });

        fastTableBody.find('.col6').on('input', (e) => {
            const rowIndex = findRowIndex($(e.target).parent('tr')[0], fastTableBody);
            fastArray[rowIndex].holeDia = +$(e.target).text();
        });

        fastTableBody.find('.col7').on('input', (e) => {
            const rowIndex = findRowIndex($(e.target).parent('tr')[0], fastTableBody);
            fastArray[rowIndex].Ebb = +$(e.target).text();
        });

        fastTableBody.find('.col8').on('input', (e) => {
            const rowIndex = findRowIndex($(e.target).parent('tr')[0], fastTableBody);
            fastArray[rowIndex].Gb = +$(e.target).text();
        });


        loadTableBody.find('.col2').on('input', (e) => {
            const loadRow = $(e.target).parent()[0];
            const index = Array.from(loadTableBody.children()).indexOf(loadRow);
            loadsArray[index].value = $(e.target).text();
        });

        const output = document.getElementById("output");

        const gridPixelGap = 50;
        const startX = gridPixelGap + 30;
        const startY = gridPixelGap;
        const colGap = 1;
        const rowGap = 1000;
        const scaleFactorRow = rowGap / gridPixelGap;
        const scaleFactorCol = colGap / gridPixelGap;
        drawGrid();

        const spacingInputs = $('.canvas-wrapper input');
        spacingInputs.each((index, item) => {
            $(item).css({'left': (index + 2) * gridPixelGap - 12 + 'px'});
        });

        spacingInputs.change((e) => {
            e.target.value = (+e.target.value).toFixed(3);
            let inputIndex = $.inArray(e.target, spacingInputs);
            $(spacingTableCells[inputIndex]).text(e.target.value);
            spacingArray[inputIndex] = +$(spacingTableCells[inputIndex]).text();
            refreshNodeSpacings();
        });


        $(spacingTableCells).on("input", (e) => {
            let cellIndex = $.inArray(e.target, spacingTableCells);
            $(spacingTableCells[cellIndex]).text();
            $(spacingInputs[cellIndex]).val((+$(e.target).text()).toFixed(3));
            spacingArray[cellIndex] = +$(spacingInputs[cellIndex]).val();
            refreshNodeSpacings();
        });
        $(spacingTableCells).on("blur", (e) => {
           $(e.target).text((+$(e.target).text()).toFixed(3));
        });
        $(spacingTableCells).on("keydown", (e) => {
           if (isNaN(parseInt(e.key)) && !(e.key === '.' || e.key === 'Backspace' || e.key === 'Delete') || e.key === 'Enter') {
                return false;
           }
        });

        function refreshNodeSpacings() {
            nodesArray.forEach((item, index) => {
                if (item.colRow[0] === 1) {
                    item.coord = 0;
                } else {
                    item.coord = spacingArray.slice().splice(0, item.colRow[0] - 1).reduce((a = 0, b = 0) => a + b);
                }
                nodeTableBody.children().eq(index).find('.col2').text(item.coord);
            });
        }

        const nodesThk = document.getElementsByClassName('node-thk');
        const nodeWidthAreaValues = document.getElementsByClassName('node-width-area');
        const nodeWidthAreaCalcs = document.getElementsByClassName('node-width-area-calc');

        const widthAreaCalc = $('#widthAreaCalc');
        const widthAreaSelect = $('#width-area-select');

        widthAreaSelect.on("change", (e) => {
            widthAreaCalc.text($(e.target).val() === 'width' ? 'Bypass Area' : 'Width');
            Array.from(nodeWidthAreaValues).forEach(item => {
                $(item).next().text(calcNodeWidthArea(widthAreaCalc.text().toLowerCase(), $(item).prev().text(), $(item).text()));
            });

        });


        $(nodeWidthAreaValues).on("input", (e) => {
            $(e.target).next().text(calcNodeWidthArea(widthAreaCalc.text().toLowerCase(), $(e.target).prev().text(), $(e.target).text()));
            const rowIndex = findRowIndex($(e.target).parent('tr')[0], nodeTableBody);
            if (widthAreaSelect.val() === 'width') {
                nodesArray[rowIndex].width = +($(e.target).text());
                nodesArray[rowIndex].area = +($(e.target).next().text());
            } else {
                nodesArray[rowIndex].area = +($(e.target).text());
                nodesArray[rowIndex].width = +($(e.target).next().text());
            }
        });

        $(nodesThk).on("input", (e) => {
            $(e.target).siblings('.col5').text(calcNodeWidthArea(widthAreaCalc.text().toLowerCase(), $(e.target).text(), $(e.target).next().text()));
            const rowIndex = findRowIndex($(e.target).parent('tr')[0], nodeTableBody);
            nodesArray[rowIndex].thk = +$(e.target).text();
        });

        function findRowIndex(row, table) {
            return Array.from(table.children()).indexOf(row);
        }

        function calcNodeWidthArea(whatCalc, thkVal, widthOrAreaVal) {
            if (thkVal && widthOrAreaVal) {
                return whatCalc === 'width' ? (+widthOrAreaVal / +thkVal).toFixed(3) : (+widthOrAreaVal * +thkVal).toFixed(3);
            }
            return null;
        }



        function createJSONFromTable(elemTable, elemArray) {
            const item = Array.from(elemTable.find('td')).find(item => !item.innerText);
            if (item && elemTable !== reactTableBody) {
                alert('Заполните все данные в таблице');
            } else {
                return JSON.stringify(elemArray);
            }
        }

        let partHorCoordArr = [];
        $(canvas).on("click", e => {
//            output.innerText = `Координаты клика: ${e.offsetX}, ${e.offsetY}. `;
            const clickRadius = 15;
            for (let i = startX; i < canvas.width; i += gridPixelGap) {
                for (let j = startY; j < canvas.height; j += gridPixelGap) {
                    if ($(createInput).prop("checked")) {
                        switch (creationMode.val()) {
                            case 'node':
                                if (Math.abs(e.offsetX - i) < clickRadius && Math.abs(e.offsetY - j) < clickRadius) {
                                    if (nodesArray.findIndex(item => item.XY[0] === i && item.XY[1] === j) === -1) {
                                        createNode(i, j);
                                    }
                                }
                                break;
                            case 'plate':
                                if (Math.abs(e.offsetY - j) < clickRadius) {
                                    if (e.offsetX - i > 0 && e.offsetX - i < gridPixelGap) {
                                        node1 = nodesArray.find(item => item.XY[0] === i && item.XY[1] === j);
                                        node2 = nodesArray.find(item => item.XY[0] === i + gridPixelGap && item.XY[1] === j);
                                        if (node1 && node2) {
                                            index = findLineElementBtwNodes(platesArray, node1, node2);
                                            if (index === -1) {
                                                createPlate(node1, node2);
                                            }
                                        }
                                        node1 = null;
                                        node2 = null;
                                    }

                                }
                                break;
                            case 'fastener':
                                if (Math.abs(e.offsetX - i) < clickRadius) {
                                    if (e.offsetY - j > 0 && e.offsetY - j < gridPixelGap) {
                                        node1 = nodesArray.find(item => item.XY[0] === i && item.XY[1] === j);
                                        node2 = nodesArray.find(item => item.XY[0] === i && item.XY[1] === j + gridPixelGap);
                                        if (node1 && node2) {
                                            index = findLineElementBtwNodes(fastArray, node1, node2);
                                            if (index === -1) {
                                                createFastener(node1, node2);
                                            }
                                        }
                                        node1 = null;
                                        node2 = null;
                                    }
                                }
                                break;
                            case 'constraint':
                                if (Math.abs(e.offsetX - i) < clickRadius && Math.abs(e.offsetY - j) < clickRadius) {
                                    node1 = nodesArray.find(item => item.XY[0] === i && item.XY[1] === j);
                                    if (node1) {
                                        index = findDotElemAtNode(constraintsArray, node1)
                                        if (index === -1) {
                                            createConstraint(node1);
                                        }
                                    }
                                    node1 = null;
                                }
                                break;
                            case 'load':
                                if (Math.abs(e.offsetX - i) < clickRadius && Math.abs(e.offsetY - j) < clickRadius) {
                                    node1 = nodesArray.find(item => item.XY[0] === i && item.XY[1] === j);
                                    if (node1) {
                                        index = findDotElemAtNode(loadsArray, node1)
                                        if (index === -1) {
                                            createLoad(node1);
                                        }
                                    }
                                    node1 = null;
                                }
                                break;
                        }
                    }
                    if (deleteInput.prop("checked")) {
                        switch (deletionMode.val()) {
                            case 'node':
                                if (Math.abs(e.offsetX - i) < clickRadius && Math.abs(e.offsetY - j) < clickRadius) {
                                    node1 = nodesArray.findIndex(item => item.XY[0] === i && item.XY[1] === j);
                                    if (node1 > -1) {
                                        deleteNode(i, j, node1);
                                    }
                                    node1 = null;
                                }
                                break;
                            case 'plate':
                                if (Math.abs(e.offsetY - j) < clickRadius) {
                                    if (e.offsetX - i > 0 && e.offsetX - i < gridPixelGap) {
                                        node1 = nodesArray.find(item => item.XY[0] === i && item.XY[1] === j);
                                        node2 = nodesArray.find(item => item.XY[0] === i + gridPixelGap && item.XY[1] === j);
                                        if (node1 && node2) {
                                            index = findLineElementBtwNodes(platesArray, node1, node2);

                                            if (index > -1) {
                                                let platePart = platesArray[index].partName;
                                                deleteElement(platesArray, index, plateTableBody);
                                                if (platesArray.every(item => item.partName !== platePart)) {
                                                    let deletedPartIndex = partHorCoordArr.findIndex(item => item.part === platePart);
                                                    if (deletedPartIndex > -1) {
                                                        partHorCoordArr.splice(deletedPartIndex,1);
                                                    }
                                                }
                                            }
                                        }

                                        node1 = null;
                                        node2 = null;
                                    }
                                }
                                break;
                            case 'fastener':
                                if (Math.abs(e.offsetX - i) < clickRadius) {
                                    if (e.offsetY - j > 0 && e.offsetY - j < gridPixelGap) {
                                        node1 = nodesArray.find(item => item.XY[0] === i && item.XY[1] === j);
                                        node2 = nodesArray.find(item => item.XY[0] === i && item.XY[1] === j + gridPixelGap);
                                        if (node1 && node2) {
                                            index = findLineElementBtwNodes(fastArray, node1, node2);
                                            if (index > -1) {
                                                deleteElement(fastArray, index, fastTableBody);
                                            }
                                        }
                                        node1 = null;
                                        node2 = null;
                                    }
                                }
                                break;
                            case 'constraint':
                                if (Math.abs(e.offsetX - i) < clickRadius && Math.abs(e.offsetY - j) < clickRadius) {
                                    index = constraintsArray.findIndex(item => item.XY[0] === i && item.XY[1] === j);
                                    if (index > -1) {
                                        deleteElement(constraintsArray, index, reactTableBody);
                                    }
                                    index = null;
                                }
                                break;
                            case 'load':
                                if (Math.abs(e.offsetX - i) < clickRadius && Math.abs(e.offsetY - j) < clickRadius) {
                                    index = loadsArray.findIndex(item => item.XY[0] === i && item.XY[1] === j);
                                    if (index > -1) {
                                        deleteElement(loadsArray, index, loadTableBody);
                                    }
                                    index = null;
                                }
                                break;
                        }
                    }
                }
            }
       });



            //if (e.offsetX < 60 && e.offsetX > 40 && e.offsetY > 40 && e.offsetY < 60) {
                //const ctx = canvas.getContext('2d');
                //ctx.fillStyle = "black";
                //ctx.moveTo(50.5,50.5);
                //ctx.arc(50.5,50.5,5,0,Math.PI*2,true);
                //ctx.fill();
                //output.innerText += `Вы кликнули по красной фигуре!`;
                //output.style.color = 'red';
            //} else if(e.offsetX < 180 && e.offsetX > 100 && e.offsetY > 120 && e.offsetY < 170) {
                //output.innerText += `Вы кликнули по зеленой фигуре!`;
                //output.style.color = 'green';
           // } else {
                //output.style.color = 'black';
            //}
//        });


        //$(canvas).on("mousemove", function(e) {
		//    var pos = $(this).offset();
		//    var elem_left = pos.left.toFixed(0);
		//    var elem_top = pos.top.toFixed(0);
		//    var x = e.pageX - elem_left;
		//    var y = e.pageY - elem_top;
		//    output.innerText = 'Координаты курсора: (' + x + '; ' + y + ')';
		//    for (let k = 50.5; k < $(canvas).width() - 0.5; k += 50) {
        //        for (let j = 50.5; j < $(canvas).height() - 0.5; j += 50) {
        //            if ((x > (k - 10)) && (x < (k + 10)) && (y > (j - 10)) && (y < (j + 10))) {
        //                console.log(1);
        //                $(canvas).css({'cursor': 'pointer'});
        //            } else {
        //                console.log(2);
        //                $(canvas).css({'cursor': 'default'});
        //            }
        //        }
		//    }
	    //});


        creationMode.change((e) => {
            if ($(e.target).val() === 'plate') {
                $('.part-selection').css('display', 'block');
            } else {
                $('.part-selection').css('display', 'none');
            }
        });


        const partRowSample = $('.part').eq(0).clone(true, true);
        const plateRowSample = $('.plate').eq(0).clone(true, true);
        const fastRowSample = $('.fastener').eq(0).clone(true, true);
        const reactRowSample = $('.reaction').eq(0).clone(true, true);
        const loadRowSample = $('.load').eq(0).clone(true, true);
        const partOptionSample = partSelection.children().eq(0).clone(true, true);

        function drawGrid() {
            if (canvas.getContext) {
                let colArray = [];
                let rowArray = [];

                let col = 1;
                let row = 1000;

                ctx.font = "14.5px serif";
                ctx.strokeStyle = "#dee2e6";
                ctx.fillStyle = "black";
                ctx.lineWidth = 1;


                for (let i = startX; i < canvas.width; i += gridPixelGap) {
                    colArray.push(col);

                    ctx.beginPath();
                    ctx.moveTo(i + 0.5, 0);
                    ctx.lineTo(i + 0.5, $(canvas).height());
                    ctx.stroke();

                    ctx.clearRect(i - 5, 0, 10, 18);
                    ctx.fillText(col, i - 4, 14);
                    col += colGap;
                }
                for (let i = startY; i < canvas.height; i += gridPixelGap) {
                    rowArray.push(row);

                    ctx.beginPath();
                    ctx.moveTo(0, i + 0.5);
                    ctx.lineTo($(canvas).width(), i + 0.5);
                    ctx.stroke();

                    ctx.clearRect(0, i - 5, 35, 18);
                    ctx.fillText(row, 3, i + 4);
                    row += rowGap;
                }
            }
        }

        function drawNode(x, y) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.fillStyle = "blue";
            ctx.arc(x, y, 5, 0, Math.PI*2, true);
            ctx.fill();
        }

        function drawConstraint(x, y) {
            ctx.beginPath();
            ctx.fillStyle = "green";
            ctx.moveTo(x, y);
            ctx.lineTo(x + 10,y + 15);
            ctx.lineTo(x - 10,y + 15);
            ctx.fill();
            drawNode(x, y);
        }

        function drawLoad(x, y) {
            ctx.beginPath();
            ctx.fillStyle = "aqua";
            ctx.strokeStyle = "aqua";
            ctx.lineWidth = 4.5;
            ctx.moveTo(x, y);
            ctx.lineTo(x + 35, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 40, y);
            ctx.lineTo(x + 24,y - 8);
            ctx.lineTo(x + 24,y + 8);
            ctx.fill();
            drawNode(x, y);
        }

        function drawLine(fromX, fromY, toX, toY, color, lineWidth) {
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineTo(toX, toY);
            ctx.stroke();
            drawNode(fromX, fromY);
            drawNode(toX, toY);
        }

        function refreshModel() {
            ctx.clearRect(startX, startY, canvas.width - startX, canvas.height - startY);
            drawGrid();
            nodesArray.forEach(item => drawNode(item.XY[0], item.XY[1]));
            platesArray.forEach(item => drawLine(item.firstNode.XY[0], item.firstNode.XY[1], item.secondNode.XY[0], item.secondNode.XY[1], 'black', 4.5));
            fastArray.forEach(item => drawLine(item.firstNode.XY[0], item.firstNode.XY[1], item.secondNode.XY[0], item.secondNode.XY[1], '#adb5bd', 5));
            constraintsArray.forEach(item => drawConstraint(item.XY[0], item.XY[1]));
            loadsArray.forEach(item => drawLoad(item.XY[0], item.XY[1]));
        }

        function addPartAtTableAndSelection() {
            const partRow = partRowSample.clone(true, true);
            let lastPartRowText = partTableBody.children().eq(parts.length - 1).find('.col1').text();
            let partName = String.fromCharCode(lastPartRowText.charCodeAt(lastPartRowText.length - 1) + 1);
            partRow.find('.col1').text('Part ' + partName);
            partRow.find('.col2 select').attr('id', 'material-' + partName).attr('name', 'material-' + partName);
            partRow.find('.col3 select').attr('id', 'ht-' + partName).attr('name', 'ht-' + partName);
            partTableBody.append(partRow);

            part = new Part;
            part.name = partRow.find('.col1').text();
            part.material = partRow.find('.col2 select').val();
            part.ht = partRow.find('.col3 select').val();
            part.E = partRow.find('.col4').text();

            partsArray.push(part);

            const partOption = partOptionSample.clone(true, true);
            partOption.attr('value', 'plate-' + partName);
            partOption.text(partTableBody.children().eq(parts.length - 1).find('.col1').text());
            partSelection.append(partOption);
        }

        function addNodeAtTable(nodeObj, coordX) {
            const nodeRow = nodeTableBody.children().eq(0).clone(true, true);
            nodeRow.find('.col1').text(nodeObj.row + nodeObj.col);
            nodeRow.find('.col2').text(coordX);
            nodeTableBody.append(nodeRow);
        }

        function addPlateAtTable(plateFirstNodeCol, plateFirstNodeRow, plateSecondNodeCol, plateSecondNodeRow) {
            const plateRow = plateRowSample.clone(true, true);
            plateRow.find('.col1').text(`${plateFirstNodeRow + plateFirstNodeCol}-${plateSecondNodeRow + plateSecondNodeCol}`);
            let selectedPart = partSelection.find("option:selected").text();
            plateRow.find('.col2').text(selectedPart);
            let rowArray = Array.from(partTableBody.children());
            let selectedPartIndex = rowArray.findIndex(item => $(item).children('.col1').text() === selectedPart);
            plateRow.find('.col3').text(partTableBody.children().eq(selectedPartIndex).find('.col4').text());
            plateTableBody.append(plateRow);
        }

        function addFastAtTable(fastFirstNodeCol, fastFirstNodeRow, fastSecondNodeCol, fastSecondNodeRow) {
            const fastRow = fastTableBody.children().eq(fastTableBody.children().length - 1).clone(true, true);
            const fastAmount = document.getElementsByClassName('fastener');
            fastTableBody.append(fillRow(fastTableBody.children().eq(fastTableBody.children().length - 1).clone(true, true),
                [[1,`${fastFirstNodeRow + fastFirstNodeCol}-${fastSecondNodeRow + fastSecondNodeCol}`]]));
//            $(fastRow).find('.col1').text(`${fastFirstNodeRow + fastFirstNodeCol}-${fastSecondNodeRow + fastSecondNodeCol}`);
//            $(fastRow).find('.col2 select').attr('id', 'type' + (fastAmount.length + 1) + '-select');
//            $(fastRow).find('.col2 select').attr('name','type' + (fastAmount.length + 1));
//            $(fastRow).find('.col3 select').attr('id', 'fastener' + (fastAmount.length + 1) + '-select');
//            $(fastRow).find('.col3 select').attr('name','fastener' + (fastAmount.length + 1));
//            $(fastRow).find('.col4 select').attr('id', 'nom-dia' + (fastAmount.length + 1) + '-select');
//            $(fastRow).find('.col4 select').attr('name','nom-dia' + (fastAmount.length + 1));
//            fastTableBody.append(fastRow);
        }

        function addConstraintAtTable(nodeObj) {
            const reactRow = reactTableBody.children().eq(0).clone(true, true);
            reactRow.find('.col1').text(nodeObj.row + nodeObj.col);
            reactTableBody.append(reactRow);
        }

        function addLoadAtTable(nodeObj) {
            const loadRow = loadTableBody.children().eq(0).clone(true, true);
            loadRow.find('.col1').text(nodeObj.row + nodeObj.col);
            loadTableBody.append(loadRow);
        }

        function fillRow(row, arrayColsVals) {
            arrayColsVals.forEach(item => {
                row.find('.col' + item[0]).text(item[1]);
            });
            return row;
        }

        function createNode(i, j) {
            const nodeXY = [i, j];
            const nodeColRow = [(i - 30) * scaleFactorCol, j * scaleFactorRow];
            let coord;
            if (nodeColRow[0] === 1) {
                coord = 0;
            } else {
                coord = spacingArray.slice().splice(0, nodeColRow[0] - 1).reduce((a, b) => a + b);
            }

            drawNode(i, j);
            node = new Node(nodeXY, nodeColRow, coord);
            nodesArray.push(node);
            if (nodesArray.length === 1) {
                fillRow(nodeTableBody.children().eq(0), [[1, nodeColRow[1] + nodeColRow[0]], [2, coord]]);
            } else {
                nodeTableBody.append(fillRow(nodeTableBody.children().eq(nodeTableBody.children().length - 1).clone(true, true), [[1,nodeColRow[1] + nodeColRow[0]], [2, coord]]))
            }
        }

        function createPlate(node1, node2) {
            const partName = partSelection.find("option:selected").text();

            let partHorCoord = {
                part: partName,
                coord: node1.colRow[1]
            };
            let existedPart = partHorCoordArr.find(item => item.part === partHorCoord.part);

            if (existedPart) {
                if (existedPart.coord !== partHorCoord.coord) {
                    return;
                }
            } else {
                partHorCoordArr.push(partHorCoord);
            }

            existedPart = null;

            plate = new Plate(node1, node2, partName);
            platesArray.push(plate);
            if (platesArray.length === 1) {
                plateTableBody.children().eq(0).find('.col1').text(`${node1.colRow[1] + node1.colRow[0]}-${node2.colRow[0] + node2.colRow[1]}`);
                const selectedPart = partSelection.find("option:selected").text();
                plateTableBody.children().eq(0).find('.col2').text(selectedPart);
                const rowArray = Array.from(partTableBody.children());
                const selectedPartIndex = rowArray.findIndex(item => $(item).children('.col1').text() === selectedPart);
                plateTableBody.children().eq(0).find('.col3').text(partTableBody.children().eq(selectedPartIndex).find('.col4').text());
            } else {
                addPlateAtTable(node1.colRow[0], node1.colRow[1], node2.colRow[0], node2.colRow[1]);
            }
            drawLine(node1.XY[0], node1.XY[1], node2.XY[0], node2.XY[1], 'black', 4.5);
        }

        function createFastener(node1, node2) {
            drawLine(node1.XY[0], node1.XY[1], node2.XY[0], node2.XY[1], '#adb5bd', 3.5);
            fastener = new Fastener(node1, node2);
            fastArray.push(fastener);
            if (fastArray.length === 1) {
                fastTableBody.children().eq(0).find('.col1').text(`${node1.colRow[1] + node1.colRow[0]}-${node2.colRow[0] + node2.colRow[1]}`);
            } else {
                addFastAtTable(node1.colRow[0], node1.colRow[1], node2.colRow[0], node2.colRow[1]);
            }
        }

        function createConstraint(node) {
            drawConstraint(node.XY[0], node.XY[1]);
            constraint = new Constraint(node.XY, node.colRow, node.coord);
            constraintsArray.push(constraint);
            if (constraintsArray.length === 1) {
                fillRow(reactTableBody.children().eq(0), [[1, constraint.colRow[1] + constraint.colRow[0]]]);
            } else {
                reactTableBody.append(fillRow(reactRowSample.clone(true, true), [[1, constraint.colRow[1] + constraint.colRow[0]]]));
            }
        }

        function createLoad(node) {
            drawLoad(node.XY[0], node.XY[1]);
            load = new Load(node.XY, node.colRow, node.coord);
            loadsArray.push(load);
            if (loadsArray.length === 1) {
                fillRow(loadTableBody.children().eq(0), [[1, load.colRow[1] + load.colRow[0]]]);
            } else {
                loadTableBody.append(fillRow(loadRowSample.clone(true, true), [[1, load.colRow[1] + load.colRow[0]]]));
            }
        }

        function deleteNode(i, j, nodeIndex) {
            const removedNode = nodesArray[nodeIndex];
            const adjacentPlates = findLineElementsAtNode(platesArray, removedNode);
            const adjacentFasteners = findLineElementsAtNode(fastArray, removedNode);
            const adjacentConstraint = findDotElemAtNode(constraintsArray, removedNode);
            const adjacentLoad = findDotElemAtNode(loadsArray, removedNode);

            if (adjacentPlates.length > 0 || adjacentFasteners.length > 0 || adjacentConstraint > -1 || adjacentLoad > -1) {
                let confirm = window.confirm('The chosen node has an adjacent element(s). If you delete it, all adjacent elements will be removed too. Are you sure?');
                if (confirm) {
                    if (adjacentPlates.length > 0) {
                        removeAdjacentElements(adjacentPlates, platesArray, plateTableBody);
                    }
                    if (adjacentFasteners.length > 0) {
                        removeAdjacentElements(adjacentFasteners, fastArray, fastTableBody);
                    }
                    if (adjacentConstraint > -1) {
                        deleteElement(constraintsArray, adjacentConstraint, reactTableBody);
                    }
                    if (adjacentLoad > -1) {
                        deleteElement(loadsArray, adjacentLoad, loadTableBody);
                    }
                } else {
                    return;
                }
            }
            deleteElement(nodesArray, nodeIndex, nodeTableBody);
        }

        function clearRow(row,...args) { // в args можно передать строки с номерами столбцов, которые очищать не нужно
            let flag;
            if (args.length === 0) {
                for (let item of row.children()) {
                    $(item).text('');
                };
            } else {
                for (let item of row.children()) {
                    flag = 0;
                    for (let i = 0; i < args.length; i++) {
                        if ($(item).hasClass(args[i])) {
                            flag = 1;
                        }
                    };
                    if (!flag) {
                        $(item).text('');
                    }
                }
            }
        }


        function findLineElementsAtNode(elemArray, node) {
            let foundedElemArray = [];
                elemArray.forEach((item, index) => {
                if (item.firstNode.colRow[0] + item.firstNode.colRow[1] === node.colRow[0] + node.colRow[1] ||
                item.secondNode.colRow[0] + item.secondNode.colRow[1] === node.colRow[0] + node.colRow[1]) {
                    foundedElemArray.push(index);
                }
            });
            return foundedElemArray;
        }

        function findLineElementBtwNodes(elemArray, node1, node2) {
            return elemArray.findIndex(item => {
                return item.firstNode.colRow[0] + item.firstNode.colRow[1] === node1.colRow[0] + node1.colRow[1] &&
                item.secondNode.colRow[0] + item.secondNode.colRow[1] === node2.colRow[0] + node2.colRow[1];
            });
        }

        function removeAdjacentElements(adjacentElements, elemArray, elemTable) {
            let flag = 0;
            adjacentElements.forEach(index => {
                if (flag === 1) {
                    index--;
                }
                deleteElement(elemArray, index, elemTable);
                flag = 1;
            });
        }

        function findDotElemAtNode(elemArray, node) {
            return elemArray.findIndex(item => item.colRow[0] + item.colRow[1] === node.colRow[0] + node.colRow[1]);
        }


        function deleteElement(elemArray, elemIndex, elemTable) {
            elemArray.splice(elemIndex, 1);
            if (elemArray.length === 0) {
                if (elemTable === fastTableBody) {
                    clearRow(elemTable.children().eq(0), 'col2');
                } else {
                    clearRow(elemTable.children().eq(0));
                }
            } else {
                elemTable.children().eq(elemIndex).remove();
            }
            refreshModel();
        }

        function addFastenerProp(index,...args) {
            args.forEach(item => {
                fastArray[index][item[0]] = item[1];
            });
        }

        const resultsBlock = $('.results');
        const resultsLoadsTable = $('.table-result-loads tbody');
        const resultsDispBlock = $('.nodal-displacement');

        $('#calc').on('click', (e) => {
            Array.from(partTableBody.children()).forEach((item, index) => {
                partsArray[index].material = $(item).find('.col3').text();
                partsArray[index].E = $(item).find('.col4').text();
            });
            console.log(partsArray);

                createJSONFromTable(partTableBody, partsArray);
                createJSONFromTable(nodeTableBody, nodesArray);
                createJSONFromTable(plateTableBody, platesArray);
                createJSONFromTable(fastTableBody, fastArray);
                createJSONFromTable(reactTableBody, constraintsArray);
                createJSONFromTable(loadTableBody, loadsArray);
                let obj= {
                    parts: partsArray,
                    nodes: nodesArray,
                    plates: platesArray,
                    fasteners: fastArray,
                    constraints: constraintsArray,
                    loads: loadsArray,
                }
                let JSONObj = JSON.stringify(obj);

                Array.from(nodeTableBody.children()).forEach((item, index) => {
                    nodesArray[index].thk = +$(item).find('.node-thk').text();
                    if (widthAreaSelect.val() === 'width') {
                        nodesArray[index].width = +$(item).find('.node-width-area').text();
                        nodesArray[index].area = +$(item).find('.node-width-area-calc').text();
                    } else {
                        nodesArray[index].area = +$(item).find('.node-width-area').text();
                        nodesArray[index].width = +$(item).find('.node-width-area-calc').text();
                    }
                });

                Array.from(fastTableBody.children()).forEach((item, index) => {
                    fastArray[index].partNumber = $(item).find('.col3').text();
                    fastArray[index].nomDia = +$(item).find('.col4').text();
                    fastArray[index].fastDia = +$(item).find('.col5').text();
                    fastArray[index].holeDia = +$(item).find('.col6').text();
                    fastArray[index].Ebb = +$(item).find('.col7').text();
                    fastArray[index].Gb = +$(item).find('.col8').text();
                    fastArray[index].spacing = +$(item).find('.col9').text();
                    fastArray[index].quantity = +$(item).find('.col10').text();
                });

                let result = convertData();
                console.log(result);

                $.ajax({
                    type: 'POST',
                    url: 'http://127.0.0.1:8000/joan/calc/',
                    contentType : 'application/json; charset=UTF-8',
                    data: result,
                    dataType: 'json',
                    success: function(data) {
                        console.log(data)
                        showResults(data);
                    }
                })
        });

        function showResults(data) {
            const keysArr = Object.keys(data);
            keysArr.forEach(item => {
                switch (item) {
                    case 'disp_vector':
                        showNodalDisplacementVector(data[item], resultsDispBlock);
                        break;
                    case 'loads_summary':
                        showLoadsSummary(data[item]);
                }
            })
            resultsBlock.css('display', 'block');
        }

        function showLoadsSummary(data) {

            $(resultsLoadsTable).html('');
            const partsAmount = partsArray.length;
            const sortedData = data.sort((item1, item2) => item2[1] - item1[1]);

            let partName = null;
            let partNodesAmount = 1;
            sortedData.forEach(dataItem => {
                const nodeRow = document.createElement('tr');

                if (partName !== transformPartNames(dataItem[1])) {
                    partName = transformPartNames(dataItem[1]);
                    const plateName = document.createElement('td');
                    $(plateName).text(partName);
                    $(nodeRow).addClass('part');
                    $(nodeRow).append(plateName);
                    partNodesAmount = 1;
                } else {
                    partNodesAmount += 1;
                    $(resultsLoadsTable).find('.part').last().children().first().attr('rowspan', partNodesAmount);
                }

                const plate = platesArray.find(plate => {
                    return (plate.firstNode.colRow[0] === dataItem[0] || plate.secondNode.colRow[0] === dataItem[0]) && plate.partName === transformPartNames(dataItem[1]);
                });

                const nodeCoord = plate.firstNode.colRow[1] + dataItem[0];
                const node = nodesArray.find(node => node.colRow[0] + node.colRow[1] === nodeCoord);
                const fastener = fastArray.find(fastener => fastener.firstNode === node || fastener.secondNode === node);

                const nodeId = document.createElement('td');
                $(nodeId).text(nodeCoord);
                $(nodeRow).append(nodeId);

                const thickness = document.createElement('td');
                $(thickness).text(parseFloat(node.thk).toFixed(3));
                $(nodeRow).append(thickness);

                const area = document.createElement('td');
                $(area).text(parseFloat(node.area).toFixed(3));
                $(nodeRow).append(area);

                const fastenersAmount = document.createElement('td');
                $(fastenersAmount).text(1);
                $(nodeRow).append(fastenersAmount);

                const fastDia = document.createElement('td');
                $(fastDia).text(fastener.holeDia.toFixed(3));
                $(nodeRow).append(fastDia);

                const loadTransfer = document.createElement('td');
                $(loadTransfer).text(dataItem[4] ? dataItem[4].toFixed(5) : 0);
                $(nodeRow).append(loadTransfer);

                const bypassLoad = document.createElement('td');
                $(bypassLoad).text(dataItem[3] ? dataItem[3].toFixed(5) : 0);
                $(nodeRow).append(bypassLoad);

                const incomingLoad = document.createElement('td');
                $(incomingLoad).text(dataItem[2] ? dataItem[2].toFixed(5) : 0);
                $(nodeRow).append(incomingLoad);

                $(resultsLoadsTable).append(nodeRow);
            });
        }

        function findConnectParts(col) {
            const fastenersOnCurrentCol = fastArray.filter(fastener => fastener.firstNode.colRow[0] === col);
            let connectParts = [];
            fastenersOnCurrentCol.forEach(fastener => {
            const firstNodePlate = platesArray.find(plate => plate.firstNode === fastener.firstNode) || platesArray.find(plate => plate.secondNode === fastener.firstNode);
            const secondNodePlate = platesArray.find(plate => plate.firstNode === fastener.secondNode) || platesArray.find(plate => plate.secondNode === fastener.secondNode);
                if (firstNodePlate && secondNodePlate)  {
                    const firstNodePart = firstNodePlate.partName.slice(-1);
                    const secondNodePart = secondNodePlate.partName.slice(-1);

                    if (!connectParts.includes(firstNodePart)) {
                        connectParts.push(firstNodePart);
                    }
                    if (!connectParts.includes(secondNodePart)) {
                        connectParts.push(secondNodePart);
                    }
                }
            });
            connectParts.sort();
            return connectParts.length === 0 ? '-' : connectParts.join('-');
        }

        function transformPartNames(partName) {
                if (typeof partName === 'string') {
                    let plateId;
                    switch (partName) {
                        case 'Part a':
                            plateId = 1;
                            break;
                        case 'Part b':
                            plateId = 2;
                            break;
                        case 'Part c':
                            plateId = 3;
                            break;
                        case 'Part d':
                            plateId = 4;
                            break;
                    }
                    return plateId;
                } else if (typeof partName === 'number') {
                    let plateId;
                    switch (partName) {
                        case 1:
                            plateId = 'Part a';
                            break;
                        case 2:
                            plateId = 'Part b';
                            break;
                        case 3:
                            plateId = 'Part c';
                            break;
                        case 4:
                            plateId = 'Part d';
                            break;
                    }
                    return plateId;
                }
            }

        function showNodalDisplacementVector(data, resultsDispElement) {
            resultsDispElement.html('');
            const numDispArray = data.map(item => item ? (+item).toExponential(3) : 0);
            const tableNodalDisp = $(document.createElement('table'));
            tableNodalDisp.addClass('table table-bordered table-sm')
            const theadNodalDisp = $(document.createElement('thead'));
            const tbodyNodalDisp = $(document.createElement('tbody'));
            theadNodalDisp.append('<tr></tr>');
            tbodyNodalDisp.append('<tr></tr>');
            tableNodalDisp.append(theadNodalDisp);
            tableNodalDisp.append(tbodyNodalDisp);
            resultsDispElement.append(tableNodalDisp);

            for (let i = 0; i < numDispArray.length; i++) {
                const tdNodalDisp = $(document.createElement('td'));
                tdNodalDisp.text(numDispArray[i]);
                console.log(tbodyNodalDisp);
                tbodyNodalDisp.find('tr').append(tdNodalDisp);
            }
//            console.log(numDispArray);
        }



        function convertData() {
            let id = null;
            let coordX = null;
            let plate = null;
            let plateId = null;
            let colsArray = [];
            let testNode = {};
            let testNodes = [];
            let method = null;

            method = document.getElementById('method-type').value;

            const sortedNodes = nodesArray.slice().sort((node1, node2) => node1.coord - node2.coord);

            sortedNodes.forEach(node => {
                if (coordX !== node.coord) {
                    coordX = node.coord;
                    if ('id' in testNode) {
                        testNodes.push(testNode);
                    }
                    testNode = {};
                    testNode.id = node.colRow[0];
                    testNode.coord_x = node.coord;
                    testNode.plates_id = [];
                    testNode.plates_th = [];
                    testNode.plates_width = [];
                    testNode.plates_area = [];

                    let fast = fastArray.find(fastener => fastener.firstNode.coord === node.coord);
                    testNode.fastener_id = fast ? fast.partNumber + fast.nomDia : '';
                    testNode.Ebb = fast ? fast.Ebb : '';
                    testNode.Gb = fast ? fast.Gb : '';
                    testNode.fast_dia = fast ? fast.fastDia : '';
                    testNode.hole_dia = fast ? fast.holeDia : '';
                    testNode.spacing = fast ? fast.spacing : '';
                    testNode.quantity = fast ? fast.quantity : '';
                }
                    testNode.plates_th.push(node.thk);
                    testNode.plates_width.push(node.width);
                    testNode.plates_area.push(node.area);
                    let plate = platesArray.find(plate => (plate.firstNode.colRow[0] + plate.firstNode.colRow[1] === node.colRow[0] + node.colRow[1]) ||
                    (plate.secondNode.colRow[0] + plate.secondNode.colRow[1] === node.colRow[0] + node.colRow[1]));
                    if (plate) {
                        testNode.plates_id.push(transformPartNames(plate.partName));
                    }
            });
            testNodes.push(testNode);

            let testPlates = {};
            console.log(platesArray);
            let sortedPlates = platesArray.slice().sort((plate1, plate2) => transformPartNames(plate1.partName) - transformPartNames(plate2.partName));
            for (let plateIndex in platesArray) {
                if (Object.keys(testPlates).some(item => +item === transformPartNames(platesArray[plateIndex].partName))) {
                    continue;
                } else {
                    const part = partsArray.find(part => part.name === platesArray[+plateIndex].partName);
                    const partMaterial = part.material.trim();
                    const partHorCoord = platesArray[+plateIndex].firstNode.colRow[1];
                    const partModule = +part.E;
                    testPlates[Object.keys(testPlates).length + 1] = [partMaterial, partHorCoord, partModule];
                }
            };
            console.log(testPlates);
            console.log(partsArray);

            let testBoundaryConditions = {};
            testBoundaryConditions.nodes_id = [];
            testBoundaryConditions.plates_id = [];
            testBoundaryConditions.constraints = [];
            let col = null;
            let j = -1;
            for (let i = 0; i < constraintsArray.length; i++) {
                if (constraintsArray[i]) {
                    const node = nodesArray.find(node => node.colRow[0] + node.colRow[1] === constraintsArray[i].colRow[0] + constraintsArray[i].colRow[1]);
                    const plateIndex = findLineElementsAtNode(platesArray, node);
                    if (col !== constraintsArray[i].colRow[0]) {
                        col = constraintsArray[i].colRow[0];
                        testBoundaryConditions.nodes_id.push(col);
                        if (node && plateIndex > -1) {
                            testBoundaryConditions.plates_id.push([transformPartNames(platesArray[plateIndex].partName)]);
                        }
                        testBoundaryConditions.constraints.push([0]);
                        j++;
                    } else {
                        console.log(j);
                        console.log(testBoundaryConditions.plates_id);
                        console.log(testBoundaryConditions.constraints);
                        testBoundaryConditions.plates_id[j].push(transformPartNames(platesArray[plateIndex].partName));
                        testBoundaryConditions.constraints[j].push(0);
                    }
                }
            }

            let testLoads = {};
            testLoads.nodes_id = [];
            testLoads.plates_id = [];
            testLoads.loads = [];
            col = null;
            j = -1;
            for (let i = 0; i < loadsArray.length; i++) {
                if (loadsArray[i]) {
                    const node = nodesArray.find(node => node.colRow[0] + node.colRow[1] === loadsArray[i].colRow[0] + loadsArray[i].colRow[1]);
                    const plateIndex = findLineElementsAtNode(platesArray, node);
                    if (col !== loadsArray[i].colRow[0]) {
                        col = loadsArray[i].colRow[0];
                        testLoads.nodes_id.push(col);
                        if (node && plateIndex > -1) {
                            testLoads.plates_id.push([transformPartNames(platesArray[plateIndex].partName)]);
                        }
                        testLoads.loads.push([+loadsArray[i].value]);
                        j++;
                    } else {
                        testLoads.plates_id[j].push(transformPartNames(platesArray[plateIndex].partName));
                        testLoads.loads[j].push(+loadsArray[i].value);
                    }
                }
            }

            let testJointInfo = {};
            testJointInfo.method = method;
            testJointInfo.nodes = testNodes;
            testJointInfo.plates = testPlates;
            testJointInfo.boundary_conditions = testBoundaryConditions;
            testJointInfo.loads = testLoads;

            return JSON.stringify(testJointInfo);

        }
});
})();
