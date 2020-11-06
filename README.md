<!-- Real estate trends -->
# realestate_trends
This project is a deep dive into the metropolitan Melbourne property market. The idea for this project was borne out of my frustration for how opaque information is about property prices, trends, and even the lack of ability to compare suburbs side-by-side when house-hunting. Property insights are often gated by a fee, which does not help home-buyers make informed decision. For these reasons, I created [Landed-Melbourne](https://landed-melbourne.herokuapp.com/).

<!-- PROJECT TREE -->
## Project Tree
* [app.py](./app.py) - python file to run flask app
* [initdb.py](./initdb.py) - python file to set up SQL database
* [Procfile](./Procfile) - for Heroku deployment
* [requirements.txt](./requirements.txt) - for Heroku deployment
* [config](/config) - location for passwords etc.
* [database](/database) - csv files for SQL database
* [model](/model)
* [notebooks](/notebooks) - jupyter notebook for data extraction, cleaning, and model generation
* [source](/source) - original data sources
    * [clean](/source/clean) - cleaned data
* [static](/static)
* [templates](/templates)
* [README.md](./README.md)

<!-- BUILT WITH -->
### Built With
* [Python](https://www.python.org/about/)
    * [requests](https://requests.readthedocs.io/en/master/)
    * [pandas](https://pandas.pydata.org/)
    * [NumPy](https://numpy.org/)
    * [matplotlib](https://matplotlib.org/)
    * [scikit-learn 0.23.2](https://scikit-learn.org/stable/user_guide.html)
    * [sqlalchemy](https://www.sqlalchemy.org/)
    * [flask](https://flask-doc.readthedocs.io/en/latest/)
    * [joblib](https://joblib.readthedocs.io/en/latest/)
* [PostgreSQL](https://www.postgresql.org/)
* [tableau](https://www.tableau.com/)
* [HTML](https://developer.mozilla.org/en-US/docs/Web/HTML)
    * [bootstrap](https://getbootstrap.com/)
* [CSS](https://www.w3.org/TR/CSS2/)
* [Javascript](https://developer.mozilla.org/en-US/docs/Web/javascript)
  * [d3.js](https://d3js.org/)
  * [Leaflet](https://leafletjs.com/)
  * [Plotly](https://plotly.com/javascript)

<!-- ACKNOWLEDGEMENTS -->
## Acknowledgements
Data sourced from:
* [Domain developer portal](https://developer.domain.com.au/docs/latest/introduction)
* [crime statistics Victoria](https://www.crimestatistics.vic.gov.au/)
* [Melbourne suburb/postcodes](https://www.matthewproctor.com/full_australian_postcodes_vic)
* [suburb geojson](https://data.gov.au/geoserver/vic-suburb-locality-boundaries-psma-administrative-boundaries/wfs?request=GetFeature&typeName=ckan_af33dd8c_0534_4e18_9245_fc64440f742e&outputFormat=json)
* [LGA geojson](https://data.gov.au/dataset/ds-dga-bdf92691-c6fe-42b9-a0e2-a4cd716fa811/details)

Webpage theme from:
* [Start Bootstrap](https://startbootstrap.com/themes/grayscale)

Other references:
* [random forest prediction interval](https://blog.datadive.net/prediction-intervals-for-random-forests/)
* [How to Create Autocomplete on an Input Field](https://www.w3schools.com/howto/howto_js_autocomplete.asp)
