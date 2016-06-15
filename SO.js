(function() {
    // Create the connector object
    var myConnector = tableau.makeConnector();

    // Define the schema
    myConnector.getSchema = function(schemaCallback) {
        var cols = [{
            id: "name",
            alias: "name",
            dataType: tableau.dataTypeEnum.string
        }, {
            id: "questions",
            alias: "questions",
            dataType: tableau.dataTypeEnum.int
        }, {
            id: "date",
            alias: "date",
            dataType: tableau.dataTypeEnum.date
        }];

        var packages = tableau.connectionData.split(";")[0].replace(/\s+/g, '').split(',');

        schemas = packages.map(function(name){
            return {
                id: name.replace(/[^a-zA-Z ]/g, ""),
                alias: name,
                columns: cols

            }
        })

        schemaCallback(JSON.parse(JSON.stringify(schemas)));
    };

    var formatTimeSO = function(time) {
        return new Date(time).getTime()/1000;
    }

    var formatTimeTab = function(time) {
        return new Date(time*1000).toISOString().slice(0, 10);
    }

    var getApiCalls = function(tag){
        var dates = tableau.connectionData.split(';')[1];
        var startTime = formatTimeSO(dates.split(':')[0]);
        var endTime = formatTimeSO(dates.split(':')[1]);

        var tagQuery = "tagged=" + tag;
        var filterQuery = "filter=total";
        var siteQuery = "site=stackoverflow";

        var apiCalls = [];
        var query = "";
        var apiCall = ""
        var boundaryTime = 0;
        var dateQuery = "";

        console.log("Dates", startTime, ":", endTime);
        while(startTime < endTime){
            boundaryTime = startTime + (60*60*24*7);
            dateQuery = "fromdate=" + startTime + "&toDate=" + boundaryTime;
            query = dateQuery + "&" + tagQuery + "&" + filterQuery + "&" + siteQuery;
            apiCall = "https://api.stackexchange.com/2.2/questions?" + query;
            apiCalls.push({
                endpoint: apiCall,
                date: formatTimeTab(startTime)
            });
            startTime = boundaryTime;
        }
        return apiCalls;
    }

    // Download the data
    myConnector.getData = function(table, doneCallback) {
        var calls = getApiCalls(table.tableInfo.alias);
        var results = [];
        $.when.apply($, calls.map(function (call){
            return $.getJSON(call.endpoint).done(function(resp) {
                console.log(resp);
                results.push({
                    name: table.tableInfo.alias,
                    date: call.date,
                    questions: resp.total
                });
            })
        }))
        .done(function (){
            table.appendRows(results);
            console.log("Results", results);
            doneCallback();
        })
    };

    tableau.registerConnector(myConnector);

    // Create event listeners for when the user submits the form
    $(document).ready(function() {
        $('.date').datepicker({
            todayBtn: true,
        });

        $("#submitButton").click(function() {
            var packages = $('#packages').val().trim();
            var startDate = $('#startDate').val().trim();
            var endDate = $('#endDate').val().trim();
            if (packages && startDate && endDate) {
                tableau.connectionData = packages + ";" + startDate + ":" + endDate; // Use this variable to pass data to your getSchema and getData functions
                tableau.connectionName = "Stack Overflow Tags"; // This will be the data source name in Tableau
                tableau.submit(); // This sends the connector object to Tableau
            } else {
                alert("Enter a valid date for each date range and tag.");
            }
        });
    });
})();
