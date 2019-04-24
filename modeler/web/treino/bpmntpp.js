function getGraphicElementByDataElementId(id, type){
    gTags = document.getElementsByTagName("g");
    for (let index = 0; index < gTags.length; index++) {
        if(gTags[index].getAttribute('data-element-id') == id){
            innerTags = gTags[index].childNodes;
            for(let j = 0; j < innerTags.length; j++){
                if(innerTags[j].nodeName == "g"){
                    
                    innerInnerTags = innerTags[j].childNodes;

                    for (let k = 0; k < innerInnerTags.length; k++) {
                        if(innerInnerTags[k].nodeName == type) {
                            return innerInnerTags[k];
                        }
                    }
                    break;
                }
            }
            break;
        }
    }
}

function changeColor(element, color) {
    if(element != null){
        if(!(typeProcess == 0 && color == 'orange')){
            element.setAttribute('style', element.getAttribute('style').replace("black", color));
        }
    }
}

function changeBackgroundColor(element, color, old) {
    if(element != null){
        if(!(typeProcess == 0 && color == 'orange')){
            element.setAttribute('style', element.getAttribute('style').replace(old, color));
        }
    }
}

var jsonOperationsColors = {};
function showOperations(){
    let removed = JSON.parse(sessionStorage.removed);
    let inserted = JSON.parse(sessionStorage.inserted);
    let changed = JSON.parse(sessionStorage.changed);

    for (let index = 0; index < removed.length; index++) {
        for (let index = 0; index < removed.length; index++) {
            if(removed[index].tagName == 'bpmn:dataObjectReference'){
                showOperationDeleteData(removed[index]);
            } else if(removed[index].tagName == 'bpmn:lane'){
                showOperationDeleteLane(removed[index]);
            } else if(removed[index].tagName == 'bpmn:participant') {
                showOperationDeletePool(removed[index]);
            } 
         }
         jsonOperationsColors[removed[index].id] = "#FF0000"
         
    }

    for (let index = 0; index < inserted.length; index++) {
        if(inserted[index].tagName == 'bpmn:dataObjectReference'){
            showOperationInsertData(inserted[index]);
        } else if(inserted[index].tagName == 'bpmn:lane'){
            showOperationInsertLane(inserted[index]);
        } else if(inserted[index].tagName == 'bpmn:participant') {
            showOperationInsertPool(inserted[index]);
        }   
        jsonOperationsColors[inserted[index].id] = "#00FF00"
        
     }
     

     for (let index = 0; index < changed.length; index++) {
        if(changed[index].tagName == 'bpmn:dataObjectReference'){
            showOperationRenameData(changed[index]);
        } else if(changed[index].tagName == 'bpmn:lane'){
            showOperationRenameLane(changed[index]);
        } else if(changed[index].tagName == 'bpmn:participant') {
            showOperationRenamePool(changed[index]);
        } 

        jsonOperationsColors[changed[index].id] = "#FF7400"
     }
        jsonOperationsColors["DataObjectReference_1xz8o2y"] = "#FFFF00";
        jsonOperationsColors["DataObjectReference_16wc8cg"] = "#FFFF00";
        jsonOperationsColors["DataObjectReference_15bk0pe"] = "#FFFF00";
        jsonOperationsColors["DataObjectReference_1eet4lf"] = "#FFFF00";
        jsonOperationsColors["DataObjectReference_0x9uzwo"] = "#FFFF00";
        jsonOperationsColors["DataObjectReference_102z47r"] = "#FFFF00";
        jsonOperationsColors["DataObjectReference_0yz6b5n"] = "#0000FF";
        jsonOperationsColors["DataObjectReference_0j95tp6"] = "#0000FF";
        jsonOperationsColors["DataObjectReference_18jm6ht"] = "#0000FF";
        jsonOperationsColors["DataObjectReference_0vzxiyd"] = "#0000FF";
        jsonOperationsColors["DataObjectReference_1sriiy4"] = "#0000FF";
        jsonOperationsColors["DataObjectReference_0iq1izx"] = "#0000FF";

}

function showOperationDeleteLane(jsonLane) {
    changeColor(getGraphicElementByDataElementId(jsonLane.id, 'rect'), 'red');
    changeColor(getGraphicElementByDataElementId(jsonLane.id, 'text'), 'red');
}

function showOperationInsertLane(jsonLane) {
    changeColor(getGraphicElementByDataElementId(jsonLane.id, 'rect'), 'green');
    changeColor(getGraphicElementByDataElementId(jsonLane.id, 'text'), 'green');
}

function showOperationRenameLane(jsonLane) {
    changeColor(getGraphicElementByDataElementId(jsonLane.id, 'rect'), 'orange');
    changeColor(getGraphicElementByDataElementId(jsonLane.id, 'text'), 'orange');
}


function showOperationDeletePool(jsonPool) {
    changeColor(getGraphicElementByDataElementId(jsonPool.id, 'rect'), 'red');
    changeColor(getGraphicElementByDataElementId(jsonPool.id, 'text'), 'red');
}

function showOperationInsertPool(jsonPool) {
    changeColor(getGraphicElementByDataElementId(jsonPool.id, 'rect'), 'green');
    changeColor(getGraphicElementByDataElementId(jsonPool.id, 'text'), 'green');
}

function showOperationRenamePool(jsonPool) {
    changeColor(getGraphicElementByDataElementId(jsonPool.id, 'rect'), 'orange');
    changeColor(getGraphicElementByDataElementId(jsonPool.id, 'text'), 'orange');
}

function showOperationInsertData(jsonData) {
  if(jsonData.id != "DataObjectReference_0vzxiyd" && jsonData.id != "DataObjectReference_1sriiy4" && jsonData.id != "DataObjectReference_18jm6ht") {
    changeColor(getGraphicElementByDataElementId(jsonData.id, 'path'), 'green');
    changeColor(getGraphicElementByDataElementId(jsonData.id+"label", 'text'), 'green');
  } else if (jsonData.id == "DataObjectReference_0vzxiyd" || jsonData.id == "DataObjectReference_1sriiy4"){
    changeColor(getGraphicElementByDataElementId(jsonData.id, 'path'), 'blue');
    changeColor(getGraphicElementByDataElementId(jsonData.id+"label", 'text'), 'blue');
  }
}

function showOperationDeleteData(jsonData) {
    if(jsonData.id != "DataObjectReference_0x9uzwo" && jsonData.id != "DataObjectReference_102z47r" && jsonData.id != "DataObjectReference_0iq1izx") {
        changeColor(getGraphicElementByDataElementId(jsonData.id, 'path'), 'red');
        changeColor(getGraphicElementByDataElementId(jsonData.id+"_label", 'text'), 'red');
    } else {
        changeColor(getGraphicElementByDataElementId("DataObjectReference_1eet4lf", 'path'), 'yellow');
        changeColor(getGraphicElementByDataElementId("DataObjectReference_1eet4lf"+"_label", 'text'), '#dede00'); 
    }
}

function showOperationRenameData(jsonData) {
    changeColor(getGraphicElementByDataElementId(jsonData.id, 'path'), 'orange');
    changeColor(getGraphicElementByDataElementId(jsonData.id+"_label", 'text'), 'orange');
}

  

function refreshTable(){
    let removed = JSON.parse(sessionStorage.removed);
    let inserted = JSON.parse(sessionStorage.inserted);
    let changed = JSON.parse(sessionStorage.changed);

    var xmlDoc = parse.parseFromString('<a></a>', 'text/xml');
	
    var tagTemp = "";
    var tag;


    var table = document.getElementById('tabelaOperacoes');

   
    linhas = 1

    var trTemp, op, par, attr;

    for (let index = 0; index < removed.length; index++) {
        if(!removed[index].id.includes("DataObject_") && !removed[index].id.includes("DataObjectReference_102z47r")){
            if(removed[index].id.includes("DataObjectReference_0x9uzwo")){

                let trTemp = table.insertRow(linhas);
                op = trTemp.insertCell(0);
                op.innerHTML = "merge"
                
                par = trTemp.insertCell(1);
                par.innerHTML = "firstElement"
                attr = trTemp.insertCell(2);
                attr.innerHTML = "DataObjectReference_0x9uzwo";
                nome = trTemp.insertCell(3);
                nome.innerHTML = "Catálogo de produtos";
                trTemp = table.insertRow(linhas+1);
                op.setAttribute('rowspan', "2");         
                par = trTemp.insertCell(0);
                par.innerHTML = "secondElement"
                attr = trTemp.insertCell(1);
                attr.innerHTML = "DataObjectReference_102z47r";
                nome = trTemp.insertCell(2);
                nome.innerHTML = "Tabela de preços";
            
                linhas +=2;

            } else if (removed[index].id.includes("DataObjectReference_0iq1izx")){
                let trTemp = table.insertRow(linhas);
                op = trTemp.insertCell(0);
                op.innerHTML = "split"
                par = trTemp.insertCell(1);
                par.innerHTML = "targetElement"
                attr = trTemp.insertCell(2);
                attr.innerHTML = removed[index].id;
                nome = trTemp.insertCell(3);
                nome.innerHTML = removed[index].name;
                linhas ++;
            } else {
                let trTemp = table.insertRow(linhas);
                op = trTemp.insertCell(0);
                op.innerHTML = "delete"
                par = trTemp.insertCell(1);
                par.innerHTML = "removedElement"
                attr = trTemp.insertCell(2);
                attr.innerHTML = removed[index].id;
                nome = trTemp.insertCell(3);
                nome.innerHTML = removed[index].name;
                linhas ++;
            }
        }
    }
    for (let index = 0; index < inserted.length; index++) {
        if(!(inserted[index].id.includes("DataObject_") || inserted[index].id.includes("MessageFlow") || inserted[index].id.includes("DataObjectReference_0vzxiyd") || inserted[index].id.includes("DataObjectReference_1sriiy4") || inserted[index].id.includes("DataObjectReference_1eet4lf"))){
            let trTemp = table.insertRow(linhas);
            op = trTemp.insertCell(0);
            op.innerHTML = "insert"
            par = trTemp.insertCell(1);
            par.innerHTML = "insertedElement"
            attr = trTemp.insertCell(2);
            attr.innerHTML = inserted[index].id;
            nome = trTemp.insertCell(3);
            nome.innerHTML = inserted[index].name;
            linhas ++;
        }
    }

    for (let index = 0; index < changed.length; index++) {
        if(!changed[index].id.includes("DataObjectReference")){
            let trTemp = table.insertRow(linhas);
            op = trTemp.insertCell(0);
            op.innerHTML = "rename"
            
            par = trTemp.insertCell(1);
            par.innerHTML = "renamedElement"
            attr = trTemp.insertCell(2);
            attr.innerHTML = changed[index].id;
            nome = trTemp.insertCell(3);
            nome.innerHTML = changed[index].originalName;
            trTemp = table.insertRow(linhas+1);
            op.setAttribute('rowspan', "2");         
            par = trTemp.insertCell(0);
            par.innerHTML = "newNameElement"
            attr = trTemp.insertCell(1);
            attr.innerHTML = changed[index].newName;
            nome = trTemp.insertCell(2);
            nome.innerHTML = changed[index].newName;
           
            linhas +=2;
        }
    }

}

