// populate filter dropdown
d3.json("/api/suburb").then(data=> {
    suburb=data.suburb;
    suburb=suburb.sort()
    suburb.forEach(function(d) {
        d3.select("#suburb").append("option").attr("value",d).text(d.split(' ').map(capitalize).join(' '))
    })
})

// function to capitalise first letter in suburb
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}