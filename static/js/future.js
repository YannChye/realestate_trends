var suburbList=[];
// populate filter dropdown
d3.json("/api/suburb").then(data=> {
    suburb=data.suburb;
    suburb=suburb.sort()
    suburb.forEach(function(d) {
        suburbList.push(d.split(' ').map(capitalize).join(' '))
        // d3.select("#suburb").append("option")
        //         .attr("value",d)
        //         .attr("name",d.split(' ').map(capitalize).join(' '))
        //         .text(d.split(' ').map(capitalize).join(' '))
    })
})

// function to capitalise first letter in suburb
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function autocomplete(inp, arr) {
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    var currentFocus;
    /*execute a function when someone writes in the text field:*/
    inp.addEventListener("input", function(e) {
        var a, b, i, val = this.value;
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        if (!val) { return false;}
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        /*for each item in the array...*/
        for (i = 0; i < arr.length; i++) {
          /*check if the item starts with the same letters as the text field value:*/
          if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
            /*create a DIV element for each matching element:*/
            b = document.createElement("DIV");
            /*make the matching letters bold:*/
            b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
            b.innerHTML += arr[i].substr(val.length);
            /*insert a input field that will hold the current array item's value:*/
            b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
            /*execute a function when someone clicks on the item value (DIV element):*/
                b.addEventListener("click", function(e) {
                /*insert the value for the autocomplete text field:*/
                inp.value = this.getElementsByTagName("input")[0].value;
                /*close the list of autocompleted values,
                (or any other open lists of autocompleted values:*/
                closeAllLists();
            });
            a.appendChild(b);
          }
        }
    });
    /*execute a function presses a key on the keyboard:*/
    inp.addEventListener("keydown", function(e) {
        var x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode == 40) {
          /*If the arrow DOWN key is pressed,
          increase the currentFocus variable:*/
          currentFocus++;
          /*and and make the current item more visible:*/
          addActive(x);
        } else if (e.keyCode == 38) { //up
          /*If the arrow UP key is pressed,
          decrease the currentFocus variable:*/
          currentFocus--;
          /*and and make the current item more visible:*/
          addActive(x);
        } else if (e.keyCode == 13) {
          /*If the ENTER key is pressed, prevent the form from being submitted,*/
          e.preventDefault();
          if (currentFocus > -1) {
            /*and simulate a click on the "active" item:*/
            if (x) x[currentFocus].click();
          }
        }
    });
    function addActive(x) {
      /*a function to classify an item as "active":*/
      if (!x) return false;
      /*start by removing the "active" class on all items:*/
      removeActive(x);
      if (currentFocus >= x.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = (x.length - 1);
      /*add class "autocomplete-active":*/
      x[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(x) {
      /*a function to remove the "active" class from all autocomplete items:*/
      for (var i = 0; i < x.length; i++) {
        x[i].classList.remove("autocomplete-active");
      }
    }
    function closeAllLists(elmnt) {
      /*close all autocomplete lists in the document,
      except the one passed as an argument:*/
      var x = document.getElementsByClassName("autocomplete-items");
      for (var i = 0; i < x.length; i++) {
        if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function (e) {
      closeAllLists(e.target);
  });
}

autocomplete(document.getElementById("suburb"), suburbList);

/*prevent default form submission*/
form.addEventListener('submit', function(event) {
  event.preventDefault();
});

function getPrediction() {
  var sub = document.querySelector("#suburb").value
  var proptype = document.querySelector("#type").value
  var bed = parseInt(document.querySelector("#bed").value);
  var bath = parseInt(document.querySelector("#bath").value)
  var car = parseInt(document.querySelector("#car").value)
  url="/predict/"+sub+"/"+proptype+"/"+bed+"/"+bath+"/"+car
  if (sub.length==0) {
    d3.select("#prediction").select("h4").text("Please select a suburb")
  }
  else {
    d3.json(url).then(function(data) {
      d3.select("#prediction").select("h4").text(data[0].prop+" in "+data[0].sub.split(' ').map(capitalize).join(' '))
      d3.select("#prediction").select("p").html(
        `<hr><b>${data[0].bed} bed ${data[0].bath} bath ${data[0].car} car space<br><br>
        estimated price</b>: AUD${data[0].med.toLocaleString()}<br>
        <b>price range</b>: AUD${data[0].low.toLocaleString()} - ${data[0].high.toLocaleString()}`)
    })
  }
}