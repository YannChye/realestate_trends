# import necessary libraries
import os
import sys
import csv
from flask import (
    Flask,
    render_template,
    request,
    jsonify)
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.sql import text
import pandas as pd
import numpy as np
import joblib

#################################################
# Flask Setup
#################################################
app = Flask(__name__)
model = joblib.load("model/xgb_final.sav")
scaler=joblib.load("model/std_scaler.bin")

#################################################
# Database Setup
#################################################

## if running locally, run the following line in the terminal before running the app.py
## where username and password are your postgres username and password
#################################################
#export DATABASE_URL=postgresql://username:password@localhost/realestate

#################################################

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', '') or "sqlite:///db.sqlite"

# Remove tracking modifications
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# create and connect to engine
engine=db.engine

#################################################

# create route that renders landing page
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/past")
def past():
    return render_template("past.html")

@app.route("/present")
def present():
    return render_template("present.html")

@app.route("/future")
def tech():
    return render_template("future.html")
    
@app.route('/predict',methods=['POST'])
def predict():
    proptype = request.form['type']
    sub = request.form['suburb']
    s1=text("SELECT \
        AVG(l.latitude),\
        AVG(l.longitude)\
        FROM listing AS l\
        WHERE l.suburb=:r\
        GROUP BY l.suburb")
    s2=text("SELECT \
        o.crime_rate,\
        AVG(l.offence_count)\
        FROM listing AS l\
        JOIN suburb AS s\
        ON s.suburb=l.suburb\
        JOIN lga\
        ON lga.lga=s.lga\
        JOIN offence_rate AS o\
        ON o.lga=s.lga\
        WHERE o.year=2020\
        AND l.year=2020\
        AND lower(s.suburb)=:r\
        GROUP BY s.suburb,o.crime_rate")    
    with engine.begin() as conn:
        response1=conn.execute(s1,r=sub)
        response2=conn.execute(s2,r=sub)
    for r in response1:
        lat=float(r[0])
        lng=float(r[1])
    for r in response2:
        crimerate=float(r[0])
        offence=int(r[1])
    beds = request.form['bed']
    bath = request.form['bath']
    car = request.form['car']
    toorak=0
    canterbury=0
    malvern=0
    eastmelb=0
    typeapartment=0
    typehouse=0
    if sub=="toorak":
        toorak=1
    elif sub=="canterbury":
        canterbury=1
    elif sub=="malvern":
        malvern=1
    elif sub=="east melbourne":
        eastmelb=0
    if proptype=="Apartment/Unit/Flat":
        typeapartment=1
    elif proptype=="House":
        typehouse=1
    predict_input=np.array([toorak,canterbury,bath,malvern,eastmelb,0,typehouse,1,0,0,typeapartment,beds,2019,lng,lat,crimerate,car,3.5,offence,6]).reshape(1,-1)
    predict_input_scaled=scaler.transform(predict_input)
    prediction=model.predict(predict_input_scaled)
    return render_template('future.html', prediction_text=prediction[0])

# @app.route("/api/latest")
# def latest():
#     with open('./source/latest_listings.csv') as csv_file:
#         data=csv.reader(csv_file,delimiter=',')
#         first_line=True
#         latest_listing=[]
#         for row in data:
#             if not first_line:
#                 latest_listing.append({
#                     "feature":row[1],
#                     "type":row[2],
#                     "bath":row[3],
#                     "bed":row[4],
#                     "car":row[5],
#                     "suburb":row[6],
#                     "postcode":row[7],
#                     "address":row[8],
#                     "latitude":row[9],
#                     "longitude":row[10],
#                     "floorplan":row[11],
#                     "soldmethod":row[12],
#                     "solddate":row[13],
#                     "soldprice":row[14]
#                 })
#             else:
#                 first_line=False
#     return jsonify(latest_listing)

# # create routes for various APIs
# suburb aggregate data
@app.route("/api/suburb/<variable>/<year>")
def suburb_year(variable,year):
    s=text("SELECT \
        l.count,\
        l.bath,\
        l.bed,\
        l.car,\
        s.suburb,\
        lga.lga,\
        l.private_treaty,\
        l.auction,\
        l.prior_to_auction,\
        l.price,\
        l.offence_count,\
        o.crime_rate\
        FROM listing AS l\
        JOIN suburb AS s\
        ON l.suburb=s.suburb\
        JOIN lga\
        ON lga.lga=s.lga\
        JOIN offence_rate AS o\
        ON o.lga=lga.lga\
        AND o.year=l.year\
        WHERE l.year=:y\
        AND lower(l.type)=:v")    

    with engine.begin() as conn:
        response=conn.execute(s,y=year,v=variable)
    allData=[]
    for r in response:
        data={
            "count":r[0],
            "bath":int(r[1]),
            "bed":int(r[2]),
            "car":int(r[3]),
            "suburb":r[4],
            "lga":r[5],
            "private_treaty":r[6],
            "auction":r[7],
            "prior_to_auction":r[8],
            "price":int(r[9]),
            "offence_count":int(r[10]),
            "crime_rate":int(r[11])
        }
        allData.append(data)

    return jsonify(allData)

# lga aggregate data
@app.route("/api/lga/<variable>/<year>")
def lga_year(variable,year):
    s=text("SELECT \
        SUM(l.count),\
        SUM(l.bath*l.count),\
        SUM(l.bed*l.count),\
        SUM(l.car*l.count),\
        lga.lga,\
        SUM(l.private_treaty),\
        SUM(l.auction),\
        SUM(l.prior_to_auction),\
        SUM(l.price*l.count),\
        o.crime_rate\
        FROM listing AS l\
        JOIN suburb AS s\
        ON s.suburb=l.suburb\
        JOIN lga\
        ON lga.lga=s.lga\
        JOIN offence_rate AS o\
        ON o.lga=lga.lga\
        AND o.year=l.year\
        WHERE l.year=:y\
        AND lower(l.type)=:v\
        GROUP BY lga.lga,o.crime_rate")    

    with engine.begin() as conn:
        response=conn.execute(s,y=year,v=variable)
    allData=[]
    for r in response:
        data={
            "count":r[0],
            "bath":int(r[1]/r[0]),
            "bed":int(r[2]/r[0]),
            "car":int(r[3]/r[0]),
            "lga":r[4],
            "private_treaty":r[5],
            "auction":r[6],
            "prior_to_auction":r[7],
            "price":int(r[8]/r[0]),
            "crime_rate":int(r[9])
        }
        allData.append(data)

    return jsonify(allData)

# lga price data for violin plot
@app.route("/api/lga_price/<variable>/<year>")
def lga_price(variable,year):
    listing=pd.read_csv("./source/clean/listings_all_clean.csv")
    listing["SoldDate"]=pd.to_datetime(listing["SoldDate"],infer_datetime_format=True)  
    listing["SoldYear"]=listing["SoldDate"].dt.year
    listing=listing[listing["SoldYear"]==int(year)]
    listing=listing[listing["Type"].str.lower()==variable]
    # sort by median house price across lgas and get index
    sorted_list=listing.groupby("lga")["SoldPrice"].median().sort_values().index
    index_map = {v:i for i,v in enumerate(sorted_list)}
    
    allData=[]
    for ind,row in listing.iterrows():
        data={
            "lga":row["lga"],
            "price":round(row["SoldPrice"]),
            "crime_rate":round(row["crime_rate_lga"]),
            "median_ind":round(index_map[row["lga"]])
        }
        allData.append(data)
    newData=sorted(allData,key=lambda k: k['median_ind'],reverse=True)

    return jsonify(newData)

# get crime rate by year for violin plot
@app.route("/api/crime_rate/<year>")
def crime(year):
    s=text("SELECT * FROM offence_rate as o\
        WHERE o.year=:y")   

    with engine.begin() as conn:
        response=conn.execute(s,y=year)
    allData=[]
    for r in response:
        data={
            "lga":r[2],
            "crime":float(r[3])
        }
        allData.append(data)
        
    return jsonify(allData)

# suburb_trend for line plot
@app.route("/api/<suburb>")
def suburb_trend(suburb):
    s=text("SELECT l.year,\
        l.type,\
        l.price\
        FROM listing AS l\
        WHERE l.suburb=:s\
        ORDER BY l.year")    

    with engine.begin() as conn:
        response=conn.execute(s,s=suburb)
    
    allData=[]
    for r in response:
        data={
            "year":r[0],
            "type":r[1],
            "price":int(r[2])
        }
        allData.append(data)

    return jsonify(allData)

# full_trend for line plot
@app.route("/api/trend")
def trend():
    with engine.begin() as conn:
        response=conn.execute(
            "SELECT l.year,\
            SUM(l.count),\
            SUM(l.price*l.count)\
            FROM listing AS l\
            GROUP BY l.year\
            ORDER BY l.year")

    allData=[]
    for r in response:
        data={
            "year":r[0],
            "price":int(r[2]/r[1])
        }
        allData.append(data)

    return jsonify(allData)

# years
@app.route("/api/years")
def years():
    with engine.begin() as conn:
        response=conn.execute("SELECT * FROM year")
    
    data=[]
    for r in response:
        data.append(r[0])
    
    allData={
        "years":data
    }
        
    return jsonify(allData)

# suburbs
@app.route("/api/suburb")
def suburb():
    with engine.begin() as conn:
        response=conn.execute("SELECT * FROM suburb")
    
    data=[]
    for r in response:
        data.append(r[0])
    allData={
        "suburb":data
    }
        
    return jsonify(allData)

# run app
if __name__ == "__main__":
    app.run()