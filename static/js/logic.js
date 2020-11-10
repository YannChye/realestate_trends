
// Victoria boundary polygons
const subCoord="https://data.gov.au/geoserver/vic-suburb-locality-boundaries-psma-administrative-boundaries/wfs?request=GetFeature&typeName=ckan_af33dd8c_0534_4e18_9245_fc64440f742e&outputFormat=json"
const lgaCoord="/lga"

// Select a listing type
function optionListingType(variable) {
    d3.select("#dropdownMenuListingType").text(variable.innerHTML);
    listingType=variable.innerHTML.split("/").join("").toLowerCase()
    getData(region,listingType,year)
    return listingType;
}

// Select a region
function optionRegion(variable) {
    d3.select("#dropdownMenuRegion").text(variable.innerHTML);
    region=variable.innerHTML.toLowerCase()
    getData(region,listingType,year)
    return region;
}

// Get listing data
function getData(region,listingType,year) {
    myMap.closePopup(); //close map popup
    if (region==="suburb") {
        var coord=subCoord;
    }
    else if (region==="lga") {
        var coord=lgaCoord;
    }
    let url="/api/"+region+"/"+listingType+"/"+year;
    d3.json(url).then((data) => {
        buildMap(coord,data)
    });
    getCrimeRate(year);
}

// Creating map object
var myMap = L.map("map", {
    center: [-37.8,144.9],
    zoom: 10
    });
  
// Adding tile layer to the map
L.tileLayer("https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}", {
  attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
  maxZoom: 15,
  id: "light-v10",
  accessToken: API_KEY
}).addTo(myMap);

// Build map
function buildMap(coord,mapdata) {
    d3.json(coord).then(function(coorddata) {
        var coordinates=coorddata.features;
        for (i=0;i<coordinates.length;i++) {
          for (j=0;j<mapdata.length;j++) {
            if (region==="suburb") {
                var mapReg=mapdata[j].suburb.toLowerCase();
                var coordReg=coordinates[i].properties.vic_loca_2.toLowerCase();
            }
            else if (region==="lga") {
                var mapReg=mapdata[j].lga.toLowerCase();
                var coordReg=coordinates[i].properties.ABB_NAME.toLowerCase();
            }
            if (mapReg==coordReg) {
                coordinates[i].properties.price=mapdata[j].price;
                coordinates[i].properties.bed=mapdata[j].bed;
                coordinates[i].properties.bath=mapdata[j].bath;
                coordinates[i].properties.car=mapdata[j].car;
                coordinates[i].properties.count=mapdata[j].count;
                coordinates[i].properties.lga=mapdata[j].lga;
                coordinates[i].properties.offence=mapdata[j].crime_rate;
                coordinates[i].properties.auction=mapdata[j].auction;
                coordinates[i].properties.auctionprior=mapdata[j].prior_to_auction;
                coordinates[i].properties.private=mapdata[j].private_treaty;
                var feature=coordinates[i];
                L.geoJSON(feature, {
                    style: function(feature) {
                        return {
                            color:"white",
                            fillColor:chooseColor(colors,feature.properties.price,2),
                            fillOpacity:1,
                            weight:1,
                        }
                    },
                    onEachFeature: function onEachFeature(feature,layer) {
                        layer.on('click',function(e) { // Function to draw trend chart when region is selected
                            if (region==="suburb") {
                                lineChart(region,e.sourceTarget.feature.properties.vic_loca_2.toLowerCase(),listingType);
                            }
                            else if (region==="lga") {
                                lineChart(region,e.sourceTarget.feature.properties.ABB_NAME.toLowerCase(),listingType);
                            }
                        })
                    }
                }).bindPopup(
                    (region==="suburb"?"<b>Suburb: </b>"+feature.properties.vic_loca_2.split(' ').map(capitalize).join(' ')+"<br>":"")+
                    "<b>LGA</b>: "+feature.properties.lga+""+"<hr>"+
                    "<b>Average "+(listingType==="apartmentunitflat"?"apartment/unit/flat":listingType)+" price</b> - AUD"+feature.properties.price.toLocaleString()+"<br>"+
                    "<b>Average property</b> - "+feature.properties.bed+(feature.properties.bed===1?" bed ":" beds ")+
                    feature.properties.bath+(feature.properties.bath===1?" bath ":" baths ")+
                    feature.properties.car+(feature.properties.car===1?" car ":" cars ")+"<br>"+
                    "<b>Auction:before auction:private sale</b> - "+
                    Math.round(feature.properties.auction/feature.properties.count*100)+":"+
                    Math.round(feature.properties.auctionprior/feature.properties.count*100)+":"+
                    Math.round(feature.properties.private/feature.properties.count*100)+"%"+
                    (region==="suburb"?"<br><br>":"<br><b>Recorded crime</b> - "+feature.properties.offence+" per 100,000 population<br><br>")+
                    "<i>*based on averages from "+feature.properties.count+" sold listings</i>")
                .addTo(myMap)
            }}
        }
        // set up the legend
        d3.selectAll(".legend").each(function(d) {
            d3.select(this).remove()});
        var legend=L.control({position:"bottomleft"});
        legend.onAdd=function() {
            var div=L.DomUtil.create("div","info legend");
            var legendInfo="<strong>Price (AUD)</strong><br><div class=\"labels\"><div class=\"min\">50,000"
                +"</div><div class=\"med\">2,700,000"
                +"</div><div class=\"max\">5,000,000"
                +"</div></div>";
            div.innerHTML=legendInfo;
            var labels=[];
            colors.forEach(function(color) {
                labels.push("<li style=\"background-color: "+color+"\"></li>")
            });
            div.innerHTML += "<ul>"+labels.join("")+"</ul>";
            return div;
        }
        legend.addTo(myMap)
    });
}

// get all years
function getYears() {
    d3.json("/api/years").then(data=> {
        years=data.years;
        makeYears(years);
    })
}
  
// Create year indicator bar
function makeYears(years) {
    var svgArea = d3.select(".progress").select("svg");
    if (!svgArea.empty()) {
        svgArea.remove();
    }
    // set year SVG dimension
    var svgHeight=50;
    var svgWidth=document.getElementById("progress").offsetWidth
    // create svg container
    var svg = d3.select(".progress").append("svg")
        .attr("height", svgHeight)
        .attr("width", svgWidth);
    // each year as an svg rectangle
    var svgGroup=svg.append("g")
        .selectAll("rect")
        .data(years)
        .enter()
        .append("rect")
        .classed("year",true)
        .attr("x",(d,index) => {
            return (svgWidth-40)/years.length*index+15;
        })
        .attr("y",5)
        .attr("width",(d,index) => {
            return (svgWidth-40)/years.length-2
        })
        .attr("height",5)
        .attr("fill","silver")
        .text((d,i) => {return years[i]})
        // when a year is selected
        .on("click",function(d) {
            let selectyear=d.path[0].innerHTML;
            d3.select(".year").text(selectyear)
            d3.select(".progress").selectAll("rect").attr("fill","silver")
            d3.select(this).attr("fill","grey")
            Plotly.relayout("line",{shapes:[{ //update line chart year indicator
                type:"line",
                x0:selectyear,
                y0:0,
                x1:selectyear,
                yref:"paper",
                y1:1,
                line:{
                  color:"#3c5563",
                  width:1.5,
                  dash:"dot"
                }
              }],
              annotations:[{
                  x:selectyear,
                  y:1.05,
                  xref:'x',
                  yref:'paper',
                  text:"<b>"+selectyear+"<b>",
                  showarrow:false,
                  font:{
                    size:12,
                    color:"#3c5563"
                  }
                }]
              })
            myMap.closePopup(); //close map popup
            d3.select("span.year").text(selectyear);
            getData(region,listingType,selectyear)// update dashboard with selected year
            return year=selectyear;
        })
        .on("mouseover",function(d) {
            toolTip.html(`<p>${this.innerHTML}</p>`)
            .style("left",`${parseInt(d3.select(this).attr("x"))+(parseInt(d3.select(this).attr("width"))/2)}px`)
            .style("top",`${parseInt($(".progress").offset().top)-20}px`)
            .style("background","grey")
            .style("opacity",1)
            d3.select(this).attr("height",10).attr("y",0)
        })
        .on("mouseout",function() {
            d3.select(this)
            .attr("height",5)
            .attr("y",5);
            toolTip.style("opacity",0)
        })
    svg.append("g")
        .selectAll("text")
        .data(years)
        .enter()
        .append("text")
        .attr("x",(d,index) => {
            return (svgWidth-40)/years.length*index+(((svgWidth-40)/years.length+2)/2);
        })
        .attr("y",25)
        .attr("font-size","10px")
        .attr("fill",colors[4])
        .text(d=>{return d})
    if (year=2020) { //colour year 2020 on default page
        for (var a of document.querySelectorAll("rect")) {
            if (a.textContent.includes(2020)) {
                d3.select(a).attr("fill","grey");
            }
        }
    }
}
  
// ToolTip for year popup
var toolTip=d3.select(".progress").append("div")
    .attr("class","tooltip")

// Get range intervals
function getColorStep(minVal,maxVal) {
    var interval=(maxVal-minVal)/9;
    var color_step=[minVal,minVal+interval,minVal+interval*2,minVal+interval*3,minVal+interval*4,minVal+interval*5,minVal+interval*6,minVal+interval*7,minVal+interval*8];
    return color_step
}

// Get color
function chooseColor(colors,feature,num) {
    if (num==1) {
        var minVal=2900;
        var maxVal=30000;
    }
    else if (num==2) {
        var minVal=50000;
        var maxVal=5500000;
    }
    var color_step=getColorStep(minVal,maxVal);
    if (feature > color_step[8]) {
        return colors[8];
    }
    else if (feature>color_step[7]) {
        return colors[7];
    }
    else if (feature>color_step[6]) {
        return colors[6];
    }
    else if (feature>color_step[5]) {
        return colors[5];
    }
    else if (feature>color_step[4]) {
        return colors[4];
    }
    else if (feature>color_step[3]) {
        return colors[3];
    }
    else if (feature>color_step[2]) {
        return colors[2];
    }
    else if (feature>color_step[1]) {
        return colors[1];
    }
    else {
        return colors[0];
    }
  }

// Get crime rate for violin plot
function getCrimeRate(year) {
    d3.select("#violin").selectAll().remove()
    var url="/api/crime_rate/"+year
    style=[]
    d3.json(url).then(data=>{
        data.forEach(function(d) {
            let col=chooseColor(colors,d.crime,1)
            style.push({target:d.lga,value:{line:{color:col}}})
        })
    violinChart(year,style)
    })
}

// violinPlot
function violinChart(year,style) {
    let url="/api/lga_price/"+listingType+"/"+year
    d3.json(url).then(function(data) {
        function unpack(data, key) {
            return data.map(function(data) { return data[key]; });
        }
        //create traces for line plot
        var data=[{
            type:"violin",
            hoveron:"points",
            hovertemplate: '<b>Price</b>: $%{x}' +
            '<br><b>LGA</b>: %{y}<br>'+
            '<b>crime rate</b>: %{text}',
            x:unpack(data,'price'),
            y:unpack(data,'lga'),
            text:unpack(data,'crime_rate'),
            points:"all",
            pointpos:0.4,
            marker: {
                size:1
            },
            orientation:"h",
            opacity:1,
            side:"positive",
            width:2,
            box: {
                visible: true
            },
            boxpoints: false,
            line: {
                color: "rgba(0,0,0,0)",
                width: 0.1
            },
            meanline: {
                visible: true
            },
            transforms: [{
                type: 'groupby',
                groups: unpack(data, 'lga'),
                styles:style
            }]
        }]
        var layout = {
            autosize:true,
            plot_bgcolor:'rgb(171,171,171)',
            paper_bgcolor:'rgb(171,171,171)',
            margin:{
                l:100,
                r:50,
                b:50,
                t:50,
                pad:0
            },
            hovermode:"closest",
            showlegend:false,
            violingap: 2,
            font:{
                family: "sans-serif",
                size:8
            },
            title: {
                "text":(listingType==="apartmentunitflat"?"Apartment":capitalize(listingType))+" Price across LGAs in "+year,
                "font":{
                    "size":"34px"},

            },
            xaxis: {
                zeroline: false,
                range: [0,5000000]
            },
            yaxis: {
                dtick: 1
            }
        }
        Plotly.newPlot("violin",data,layout)
    })
}

// function to change color of the legend for the violin chart
function violinColor(colors) {
    var svgViolin = d3.select(".violincolor").select("svg");
    if (!svgViolin.empty()) {
        svgViolin.remove();
    }
    // set year SVG dimension
    var svgHeight=30;
    var svgWidth=0.95*$("#violin").width();
    // create svg container
    var svg = d3.select(".violincolor").append("svg")
        .attr("height", svgHeight)
        .attr("width", svgWidth-10);
    // each year as an svg rectangle
    var svgGroup=svg.append("g")
        .selectAll("rect")
        .data(colors)
        .enter()
        .append("rect")
        .classed("year",true)
        .attr("x",(d,index) => {
            return (svgWidth-5)/colors.length*index;
        })
        .attr("y",5)
        .attr("width",(d,index) => {
            return (svgWidth-5)/colors.length
        })
        .attr("height",10)
        .attr("fill",(d) => {return d})
}

// function to capitalise first letter in suburb
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// function for suburb trend plot
function lineTrend() {
    var yearsAll=[]
    var priceAll=[]
    d3.json("/api/trend").then(function(data) { //overall average plot
        data.forEach(function(d) {
            yearsAll.push(d.year)
            priceAll.push(d.price)
        })
        var traceAll={
            x:yearsAll,
            y:priceAll,
            hovertemplate:`<b>All properties<br>All suburbs</b><br>year: %{x}<br>price: AUD%{y}`,
            name:"",
            line:{
                color:"#a6a1a1",
                width:3
            }
        }
        var layout={
            autosize:true,
            plot_bgcolor:'rgb(171,171,171)',
            paper_bgcolor:'rgb(171,171,171)',
            showlegend:false,
            margin:{
                l:100,
                r:50,
                b:20,
                t:50,
                pad:0
            },
            hovermode:"closest",
            title:{
                "text":"<b>Property Price Trend</b>"},
            height:300,
            font:{
                family:'sans-serif',
                size:12
                },
            xaxis:{automargin:true,
                title:{
                text:"<b>Year</b>",
                standoff:10}},
            yaxis:{title:{
                text:"<b>Price (AUD)</b>"}},
            shapes:[{
                type:"line",
                x0:year,
                y0:0,
                x1:year,
                yref:"paper",
                y1:1,
                line:{
                    color:"#3c5563",
                    width:1.5,
                    dash:"dot"
                }
            }],
        annotations:[
          {
            x:year,
            y:1.1,
            xref:'x',
            yref:'paper',
            text:"<b>"+year+"<b>",
            showarrow:false,
            font:{
              size:12,
              color:"#3c5563"
            }
          }
        ]
      }
      Plotly.newPlot("line",[traceAll],layout);
    })
}

//suburb trend line chart
function lineChart(region,suburb,listingType) {
    try {
        Plotly.deleteTraces("line",1)
        Plotly.deleteTraces("line",1)
        Plotly.deleteTraces("line",1)
        Plotly.deleteTraces("line",1)
        Plotly.deleteTraces("line",1)
        Plotly.deleteTraces("line",1)
    }
    catch (e) {}
    if (region=="suburb") {
        var url="/api/"+suburb
    }
    else {
        var url="/api/lga/"+suburb
    }
    var aggregPrice=[[],[],[]];
    var years=[[],[],[]]
    d3.json(url).then(function(data) {
      data.forEach(function(d) {
        if (d.type=="ApartmentUnitFlat") {
          years[0].push(d.year);
          aggregPrice[0].push(d.price);
        }
        else if (d.type=="House") {
            years[1].push(d.year);
            aggregPrice[1].push(d.price);
        }
        else if (d.type=="Townhouse") {
            years[2].push(d.year);
            aggregPrice[2].push(d.price);
        }
      })
      //create traces for line plot
      var traceApartment={
        x:years[0],
        y:aggregPrice[0],
        text:Array(years[0].length).fill(capitalize(suburb)),
        hovertemplate:`<b>Apartments/Units/Flats in %{text}</b><br>year: %{x}<br>price: AUD%{y}`,
        type:"line",
        name:"",
        line:{
            color:(listingType=="apartmentunitflat"?colors[5]:colors[4]),
          width:3
        }
      }
      var traceHouse={
        x:years[1],
        y:aggregPrice[1],
        text:Array(years[0].length).fill(capitalize(suburb)),
        hovertemplate:`<b>House in %{text}</b><br>year: %{x}<br>price: AUD%{y}`,
        type:"line",
        name:"",
        line:{
          color:(listingType=="house"?colors[5]:colors[4]),
          width:3
        }
      }
      var traceTownhouse={
        x:years[2],
        y:aggregPrice[2],
        text:Array(years[0].length).fill(capitalize(suburb)),
        hovertemplate:`<b>Townhouse in %{text}</b><br>year: %{x}<br>price: AUD%{y}`,
        type:"line",
        name:"",
        line:{
          color:(listingType=="townhouse"?colors[5]:colors[4]),
          width:3
        }
      }
      // base line plot
      Plotly.addTraces("line",[traceApartment,traceHouse,traceTownhouse]);
    })
  }


//starting variable
var colors=["#05668D","#236889","#406984","#5E6B7F","#7B6C7A","#996E76","#B66F71","#D3706C","#F07167"];
var listingType="house";
var region="suburb";
var year=2020
lineTrend()
getYears()
getData(region,listingType,year) 
violinColor(colors)