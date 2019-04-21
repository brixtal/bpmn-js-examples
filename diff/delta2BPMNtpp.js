
function delta2BPMNtpp(deltaSrc){
    parser = new DOMParser();

    diff = parser.parseFromString(deltaSrc, "text/xml");

    removedTags = diff.getElementsByTagName("remove");

    insertTags = diff.getElementsByTagName("insert");

    let removed = [];
    let inserted = [];
    let changed = [];

    for (let index = 0; index < removedTags.length; index++) {
        const element = removedTags[index];
        if(isOrganizationalOrInformationalPerspective(element.innerHTML)){
            let json = structuredJson(element.innerHTML);
            removed.push(json);
        }        
    }

    for (let index = 0; index < insertTags.length; index++) {
        const element2 = insertTags[index];
        if(isOrganizationalOrInformationalPerspective(element2.innerHTML)){
            let json = structuredJson(element2.innerHTML);
            inserted.push(json);
        }
    }
    
    for (let i = 0; i < removed.length; i++) {
        for (let j = 0; j < inserted.length; j++) {
            if(inserted[j] != null && removed[i] != null && removed[i].id == inserted[j].id){
                changed.push({
                    "id": removed[i].id,
                    "tagName": removed[i].tagName,
                    "originalName": removed[i].name,
                    "newName": inserted[j].name,
                    "elements": [removed[i], inserted[j]]
                });
                delete removed[i];
                delete inserted[j];
                i--;
                break;
            }
        }
    }

    removed = removed.filter(function (el) {
        return el != null;
    });

    inserted = inserted.filter(function (el) {
        return el != null;
    });

    sessionStorage.removed = JSON.stringify(removed);
    sessionStorage.inserted = JSON.stringify(inserted);
    sessionStorage.changed = JSON.stringify(changed);
}

function isOrganizationalOrInformationalPerspective(innerHTML) {

    let acceptedTags = ["bpmn:participant", "bpmn:dataObjectReference", "bpmn:lane"];

    for (let index = 0; index < acceptedTags.length; index++) {
        if(innerHTML.includes(acceptedTags[index])){
            return true;
        }
    }
    return false;
}

function structuredJson(innerHTML){
    let parsedXML = parser.parseFromString(innerHTML.trim(), "text/xml");
            
    let tagName = parsedXML.childNodes[0].tagName;
    let id = parsedXML.childNodes[0].id;
    let name = parsedXML.childNodes[0].getAttribute('name');
    let json =  {
                    "tagName": tagName, 
                    "id": id, 
                    "name": name, 
                    "originalTag": innerHTML.trim()
                };

    return json;
}