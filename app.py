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
import json

#################################################
# Flask Setup
#################################################
app = Flask(__name__)
#model = joblib.load("model/rf_final.sav")
#scaler=joblib.load("model/std_scaler.bin")

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

# lga coordinates file
@app.route("/lga")
def geog():
    with open('./static/assets/data/LGA.csv') as csv_file:
        data=csv_file.read()
    return data

# ml_model
@app.route("/predict/<sub>/<prop>/<bed>/<bath>/<car>")
def predict(sub,prop,bed,bath,car):
    database=pd.read_csv('./static/assets/data/predict.csv')
    database=database[database["suburb"]==sub.lower()]
    database=database[database["property"]==prop]
    database=database[database["bed"]==int(bed)]
    database=database[database["bath"]==int(bath)]
    database=database[database["car"]==int(car)]
    database=database.reset_index(drop=True)
    medPrice=database.loc[0,"medPrice"]
    lowPrice=database.loc[0,"lowPrice"]
    highPrice=database.loc[0,"highPrice"]

    return jsonify([{"sub":sub,"prop":prop,"bed":bed,"bath":bath,"car":car,"med":int(medPrice),"low":int(lowPrice),"high":int(highPrice)}])

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
    listing=listing[listing["Year"]==int(year)]
    listing=listing[listing["Type"].str.lower()==variable]
    # sort by median house price across lgas and get index
    sorted_list=listing.groupby("Local Government Area")["SoldPrice"].median().sort_values().index
    index_map = {v:i for i,v in enumerate(sorted_list)}
    
    allData=[]
    for ind,row in listing.iterrows():
        data={
            "lga":row["Local Government Area"],
            "price":round(row["SoldPrice"]),
            "crime_rate":round(row["Rate per 100,000 population"]),
            "median_ind":round(index_map[row["Local Government Area"]])
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

# lga_trend for line plot
@app.route("/api/lga/<lga>")
def lga_trend(lga):
    s=text("SELECT l.year,\
        l.type,\
        AVG(l.price)\
        FROM listing AS l\
        JOIN suburb AS s\
        ON s.suburb=l.suburb\
        JOIN lga\
        on lga.lga=s.lga\
        WHERE lower(lga.lga)=:r\
        GROUP BY lga.lga,l.year,l.type\
        ORDER BY l.year")    

    with engine.begin() as conn:
        response=conn.execute(s,r=lga)
    
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