
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
            removed = mergeJson(removed, json);
        }        
    }

    for (let index = 0; index < insertTags.length; index++) {
        const element2 = insertTags[index];
        if(isOrganizationalOrInformationalPerspective(element2.innerHTML)){
            let json = structuredJson(element2.innerHTML);
            inserted = mergeJson(inserted, json);
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
    console.log(removed);
    console.log(inserted);
    console.log(changed);
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
    let tagsText = innerHTML.split('\n');
    // for (let index = 0; index < tagsText.length; index++) {
    //     console.log("========>", tagsText[index]);
        
    // }
    let tagsJson = [];
    for (let j = 0; j < tagsText.length; j++) {
            
        let parsedXML = parser.parseFromString(tagsText[j].trim(), "text/xml");
        let tags = parsedXML.childNodes;
        
        for (let index = 0; index < tags.length; index++) {
            let tagName = tags[index].tagName;
            let id = tags[index].id;
            let name = tags[index].getAttribute('name');
            let json =  {
                            "tagName": tagName, 
                            "id": id, 
                            "name": name, 
                            "originalTag": tagsText[j].trim()
                        };
            tagsJson.push(json);
        }
    }
    
    return tagsJson;
}

function mergeJson(a, b){

    for (let index = 0; index < b.length; index++) {
        a.push(b[index]);
    }

    return a;
}