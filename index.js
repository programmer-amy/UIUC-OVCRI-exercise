let fs = require('fs');

function BuildDate(inputString) {
    //expected format MM/DD/YYYY:<integer>/<integer>/<integer> example:4/22/2023
    //-1 is the error value
    if(inputString === null) {
        return -1;
    }
    inputString = inputString.split('/');
    if (
        inputString.length == 3 &&
        Number.isInteger(Number(inputString[0])) &&
        Number.isInteger(Number(inputString[1])) &&
        Number.isInteger(Number(inputString[2])) 
    ) {
        //JavaScript counts months from 0 to 11: January = 0, December = 11.
        return new Date(inputString[2], Number(inputString[0]) - 1, inputString[1]);
    }
    else {
        return -1
    }
}

function AddOneMonth(inputDate) {
    let inputDateOneMonth = new Date(inputDate);
    inputDateOneMonth.setMonth(inputDate.getMonth()+ 1);
    return inputDateOneMonth;        
}

function HashMapToArray(hashMap) {
    let tempArray = [];
    let hashMapKeys = Object.keys(hashMap);
    let hashMapItem;
    for (let i = 0;i < hashMapKeys.length;i++) {
        hashMapItem = hashMap[hashMapKeys[i]];
        tempArray.push(hashMapItem);
    }
    return tempArray;
}

function IsWithinFiscalYear(timestamp, fiscalYear) {
    //fiscal year (defined as 7/1/n-1 – 6/30/n)
    let fiscalYearStart = BuildDate( "7/1/" + (fiscalYear-1));
    let fiscalYearStop = BuildDate( "6/30/" + fiscalYear);
    let timestampDate = BuildDate(timestamp)
    if (
        fiscalYearStart != -1 &&
        fiscalYearStop != -1 &&
        timestampDate != -1 &&
        timestampDate >= fiscalYearStart &&
        timestampDate <= fiscalYearStop
    )
    {
        return true;
    }
    else {
        return false;
    }
}

function ReduceToMostRecentTrainings(personList) {
    let mostRecentTrainingPersonList = [];
    let tempPerson;
    let completionsHashMap;
    let tempCompletionName;
    let tempTimestampOld;
    let tempTimestampNew;
    for(let i = 0;i < personList.length;i++) {
        tempPerson = {};
        tempPerson.name = personList[i].name;
        completionsHashMap = {};        
        for(let j = 0;j < personList[i].completions.length;j++) {
            tempCompletionName = personList[i].completions[j].name;       
            if (tempCompletionName in completionsHashMap) {
                tempTimestampOld = BuildDate(completionsHashMap[tempCompletionName].timestamp);
                tempTimestampNew = BuildDate(personList[i].completions[j].timestamp);
                if(
                    tempTimestampOld != -1 &&
                    tempTimestampNew != -1 &&
                    tempTimestampNew > tempTimestampOld
                ) {
                    completionsHashMap[tempCompletionName] = personList[i].completions[j];
                }                    
            }
            else {
                completionsHashMap[tempCompletionName] = personList[i].completions[j];
            }

        }
        tempPerson.completions = HashMapToArray(completionsHashMap);        
        mostRecentTrainingPersonList.push(tempPerson);
    }
    return mostRecentTrainingPersonList;
}

function MakeCompletedTrainingList(trainingData) {    
    let trainingListHashMap = {};
    let trainingName;
    for(let i = 0;i < trainingData.length;i++) {
        for(let j = 0;j < trainingData[i].completions.length;j++) {
            trainingName = trainingData[i].completions[j].name;
            if(trainingName in trainingListHashMap) {
                (trainingListHashMap[trainingName]).count += 1;
            }
            else {
                trainingListHashMap[trainingName] = {};
                (trainingListHashMap[trainingName]).name = trainingName;
                (trainingListHashMap[trainingName]).count = 1;
                //(trainingListHashMap[trainingName])[trainingName] = 1;
            }
        }
    }
    return HashMapToArray(trainingListHashMap);
}

function MakeSpecifiedTrainingInFiscalYearList(trainingData, fiscalYear, trainings) {
    let specifiedTrainingInFiscalYearHashMap = {};
    let personName;
    let trainingName;
    let trainingTimestamp
    for(let i = 0;i < trainingData.length;i++) {
        personName = trainingData[i].name;
        for(let j = 0;j < trainingData[i].completions.length;j++) {
            trainingName = trainingData[i].completions[j].name;
            trainingTimestamp = trainingData[i].completions[j].timestamp;
            if(
                trainingName in trainings &&
                IsWithinFiscalYear(trainingTimestamp, fiscalYear)
            ) {
                if(trainingName in specifiedTrainingInFiscalYearHashMap) {
                    (specifiedTrainingInFiscalYearHashMap[trainingName]).people.push(personName);
                }
                else {
                    specifiedTrainingInFiscalYearHashMap[trainingName] = {};
                    (specifiedTrainingInFiscalYearHashMap[trainingName]).name = trainingName;
                    (specifiedTrainingInFiscalYearHashMap[trainingName]).people = [personName];
                }
            }
        }
    }
    return HashMapToArray(specifiedTrainingInFiscalYearHashMap);    
}

function MakeExpiredTrainings(trainingData, expiredTarget) {
    let expiredTrainingsList = [];
    let tempPerson;
    let expiredTargetDate = new BuildDate(expiredTarget);    
    let expiredTargetDateMonthForward = AddOneMonth(expiredTargetDate);
    let expiresDate;
    for(let i =0;i < trainingData.length;i++) {
        tempPerson = null;
        for(let j = 0;j < trainingData[i].completions.length;j++) {
            if(trainingData[i].completions[j].expires != null)
            {
                expiresDate = BuildDate(trainingData[i].completions[j].expires);
                if(
                    (expiresDate != -1) 
                    && 
                    (
                        expiredTargetDate > expiresDate ||                        
                        expiredTargetDateMonthForward > expiresDate
                    )
                ) {
                    if (tempPerson == null) {
                        tempPerson = {};
                        tempPerson.name = trainingData[i].name;
                        tempPerson.completions = [];
                    }

                    tempPerson.completions.push(
                        {
                            "name": trainingData[i].completions[j].name,
                            "timestamp": trainingData[i].completions[j].timestamp,
                            "expires": trainingData[i].completions[j].expires,
                            "expiredStatus": expiredTargetDate > expiresDate ? "expired" : "expired soon" 
                        }
                    );
                }
            }
        }
        if (tempPerson != null) expiredTrainingsList.push(tempPerson);
    }
    return expiredTrainingsList;
}

function ReadObjectFromFile(fileName) {
    return JSON.parse(fs.readFileSync(fileName, "utf8"));
}

function WriteObject(obj, fileName) {
    let objString = JSON.stringify(obj, null, " ");
    fs.writeFileSync(fileName, objString);
}

function Main() {
    let trainingData = ReadObjectFromFile("trainings (correct).txt");
    let fiscalYear = 2024
    let trainings = {
        "Electrical Safety for Labs":0, 
        "X-Ray Safety":0, 
        "Laboratory Safety Training":0
    };
    let expiredTarget = "10/1/2023" //Use date: Oct 1st, 2023

    let mostRecentTrainingData = ReduceToMostRecentTrainings(trainingData);

    let completedTrainingList = MakeCompletedTrainingList(mostRecentTrainingData);
    let specifiedTrainingInFiscalYearList = MakeSpecifiedTrainingInFiscalYearList(mostRecentTrainingData, fiscalYear, trainings);
    let expiredTrainings = MakeExpiredTrainings(mostRecentTrainingData, expiredTarget);

    WriteObject(completedTrainingList, "CompletedTrainingList.json");
    WriteObject(specifiedTrainingInFiscalYearList, "SpecifiedTrainingInFiscalYearList.json");
    WriteObject(expiredTrainings, "ExpiredTrainings.json");    
}

Main();