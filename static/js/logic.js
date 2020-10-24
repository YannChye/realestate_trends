//SideNav https://www.w3schools.com/howto/howto_js_sidenav.asp
/* Set the width of the side navigation to 250px */
function openNav() {
    document.getElementById("mySidenav").style.width = "250px";
  }

/* Set the width of the side navigation to 0 */
function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
}

// Victoria boundary polygons
const subCoord="https://data.gov.au/geoserver/vic-suburb-locality-boundaries-psma-administrative-boundaries/wfs?request=GetFeature&typeName=ckan_af33dd8c_0534_4e18_9245_fc64440f742e&outputFormat=json"
const lgaCoord="LGA.geojson"

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
        console.log(coordinates[0].properties.abb_name.toLowerCase())
        for (i=0;i<coordinates.length;i++) {
          for (j=0;j<mapdata.length;j++) {
            if (region==="suburb") {
                var mapReg=mapdata[j].suburb.toLowerCase();
                var coordReg=coordinates[i].properties.vic_loca_2.toLowerCase();
            }
            else if (region==="lga") {
                var mapReg=mapdata[j].lga.toLowerCase();
                var coordReg=coordinates[i].properties.abb_name.toLowerCase();
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
                                lineChart(e.sourceTarget.feature.properties.vic_loca_2.toLowerCase());
                            }
                            else if (region==="lga") {
                                lineChart(e.sourceTarget.feature.properties.abb_name.toLowerCase());
                            }
                        })
                    }
                }).bindPopup(
                    "<b>"+(region==="suburb"?feature.properties.vic_loca_2.split(' ').map(capitalize).join(' ')+"<br>":"")+
                    "LGA: "+feature.properties.lga+"</b>"+"<hr>"+
                    feature.properties.count+" "+listingType+" sold<br>"+
                    "<b>average property:</b> "+feature.properties.bed+(feature.properties.bed===1?" bed ":" beds ")+
                    feature.properties.bath+(feature.properties.bath===1?" bath ":" baths ")+
                    feature.properties.car+(feature.properties.car===1?" car ":" cars ")+"<br>"+
                    "<b>average price:</b> AUD"+feature.properties.price.toLocaleString()+"<br>"+
                    Math.round(feature.properties.auction/feature.properties.count*100)+"% sold at auction<br>"+
                    Math.round(feature.properties.auctionprior/feature.properties.count*100)+"% sold prior to auction<br>"+
                    Math.round(feature.properties.private/feature.properties.count*100)+"% sold via private treaty")
                .addTo(myMap)
            }}
        }
        // set up the legend
        d3.selectAll(".legend").each(function(d) {
            d3.select(this).remove()});
        var legend=L.control({position:"bottomleft"});
        legend.onAdd=function() {
            var div=L.DomUtil.create("div","info legend");
            var legendInfo="<strong>Price (AUD)</strong><div class=\"labels\"><div class=\"min\">200,000"
                +"</div><div class=\"med\">1,400,000"
                +"</div><div class=\"max\">3,000,000"
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
    var svgWidth=document.getElementById("leftMap").offsetWidth;
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
        .attr("fill",colors[5])
        .text((d,i) => {return years[i]})
        // when a year is selected
        .on("click",function(d) {
            let selectyear=d.path[0].innerHTML;
            d3.select(".year").text(selectyear)
            d3.selectAll("rect").attr("fill",colors[5])
            d3.select(this).attr("fill",colors[0])
            myMap.closePopup(); //close map popup
            getData(region,listingType,selectyear)
            getCrimeRate(selectyear); // update dashboard with selected year
            return year=selectyear;
        })
        .on("mouseover",function(d) {
            toolTip.html(`<p>${this.innerHTML}</p>`)
            .style("left",`${parseInt(d3.select(this).attr("x"))+(parseInt(d3.select(this).attr("width"))/2)}px`)
            .style("top","20px")
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
        .text(d=>{return d})
    if (year=2020) { //colour year 2020 on default page
        for (var a of document.querySelectorAll("rect")) {
            if (a.textContent.includes(2020)) {
                d3.select(a).attr("fill",colors[0]);
            }
        }
    }
}
  
// ToolTip for year popup
var toolTip=d3.select(".progress").append("div")
    .attr("class","tooltip")

// Colorblind mode
function changeColor() {
    var colorBlind = document.getElementById('customSwitches');
    if(colorBlind.checked){
        colors=["#2F2F83","#404181","#51527D","#63637A","747476","#868574","979670","A8A76C","B9B769"];
    } else {
        colors=["#05668D","#236889","#406984","#5E6B7F","#7B6C7A","#996E76","#B66F71","#D3706C","#F07167"];
    }
    violinColor(colors)
    return colors
}

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
        var minVal=200000;
        var maxVal=3000000;
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
            margin:{
                l:50,
                r:0,
                b:50,
                t:50,
                pad:0
            },
            hovermode:"closest",
            showlegend:false,
            font:{
                family:'Times New Roman, Times, serif',
                size:8
            },
            title: listingType+" Price across LGAs",
            xaxis: {
                zeroline: false,
                range: [0,5000000]
            }
        }
        Plotly.newPlot("violin",data,layout)
    })
}

function violinColor(colors) {
var svgViolin = d3.select(".violincolor").select("svg");
if (!svgViolin.empty()) {
    svgViolin.remove();
}
// set year SVG dimension
var svgHeight=50;
var svgWidth=$("#violin").width();
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
        .attr("height",20)
        .attr("fill",(d) => {return d})
}

// function to capitalise first letter in suburb
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}


function lineTrend() {
    var yearsAll=[]
    var priceAll=[]
    d3.json("/api/trend").then(function(data) {
        data.forEach(function(d) {
            yearsAll.push(d.year)
            priceAll.push(d.price)
        })
        var traceAll={
            x:yearsAll,
            y:priceAll,
            hovertemplate:`<b>All properties<br>All suburbs</b>year: %{x}<br>price: AUD%{y}`,
            name:"",
            line:{
                color:"black",
                width:3
            }
        }
        var layout={
            showlegend:false,
            margin:{
                l:50,
                r:0,
                b:50,
                t:50,
                pad:0
            },
            hovermode:"closest",
            title:{
                "text":"Property Price Trend",
                "xanchor":"right",
                "x":1,
                "y":0.95,
                "yanchor":"top"
            },
            font:{
                family:'Times New Roman, Times, serif',
                size:10
                },
            xaxis:{title:{
                text:"Year",
                standoff:5}},
            yaxis:{title:{
                text:"Price (AUD)"}},
            shapes:[{
                type:"line",
                x0:year,
                y0:0,
                x1:year,
                yref:"paper",
                y1:1,
                line:{
                    color:"#004d40",
                    width:1.5,
                    dash:"dot"
                }
            }],
        annotations:[
          {
            x:year,
            y:1.05,
            xref:'x',
            yref:'paper',
            text:"<b>"+year+"<b>",
            showarrow:false,
            font:{
              size:12,
              color:"#004d40"
            }
          }
        ]
      }
      Plotly.newPlot("bar",[traceAll],layout);
    })
}

//suburb trend line chart
function lineChart(suburb,listingType) {
    try {
        Plotly.deleteTraces("bar",[1,2,3])
    }
    catch (e) {}
    let url="/api/"+suburb
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
        hovertemplate:`<b>Apartments/Units/Flats</b><br>year: %{x}<br>price: AUD%{y}`,
        type:"line",
        name:"",
        line:{
          color:(listingType==="apartmentunitflat"?colors[0]:colors[2]),
          width:3
        }
      }
      var traceHouse={
        x:years[1],
        y:aggregPrice[1],
        hovertemplate:`<b>House</b><br>year: %{x}<br>%{y}`,
        type:"line",
        name:"",
        line:{
          color:(listingType==="apartmentunitflat"?colors[0]:colors[2]),
          width:3
        }
      }
      var traceTownhouse={
        x:years[2],
        y:aggregPrice[2],
        hovertemplate:`<b>Townhouse</b><br>year: %{x}<br>%{y}`,
        type:"line",
        name:"",
        line:{
          color:(listingType==="apartmentunitflat"?colors[0]:colors[2]),
          width:3
        }
      }
      // base line plot
      Plotly.addTraces("bar",[traceApartment,traceHouse,traceTownhouse]);
    })
  }


//starting variable
var colors=["#05668D","#236889","#406984","#5E6B7F","#7B6C7A","#996E76","#B66F71","#D3706C","#F07167"];
lineTrend()
var listingType="house";
var region="suburb";
var year=2020
getYears()
getData(region,listingType,year) 
violinColor(colors)