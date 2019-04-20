function delta2BPMNtpp(deltaSrc){
    parser = new DOMParser();

    diff = parser.parseFromString(deltaSrc, "text/xml");

    removedTags = diff.getElementsByTagName("remove");

    insertTags = diff.getElementsByTagName("insert");

    let removed = [];
    let inserted = [];

    console.log(removedTags, insertTags);

    for (let index = 0; index < removedTags.length; index++) {
        const element = removedTags[index];
        if(isOrganizationalOrInformationalPerspective(element.innerHTML)){
            removed.push(element.innerHTML.trim());
        }        
    }

    for (let index = 0; index < insertTags.length; index++) {
        const element2 = insertTags[index];
        if(isOrganizationalOrInformationalPerspective(element2.innerHTML)){
            inserted.push(element2.innerHTML.trim());
        }        
    }

    console.log(removed, inserted);
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