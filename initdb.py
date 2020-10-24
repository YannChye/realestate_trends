# import dependencies
import os
import pandas as pd
import sys
sys.path.append('./config')
from password import username, password
from sqlalchemy import create_engine, inspect
from sqlalchemy_utils import database_exists, create_database

# import csv data
building=pd.read_csv(os.path.join('database','building.csv'))
lga=pd.read_csv(os.path.join('database','lga.csv'))
listing=pd.read_csv(os.path.join('database','listing.csv'))
offence_rate=pd.read_csv(os.path.join('database','offence_rate.csv'))
suburb=pd.read_csv(os.path.join('database','suburb.csv'))
year=pd.read_csv(os.path.join('database','year.csv'))

# create engine and database
engine = create_engine('postgresql://'+username+':'+password+'@localhost/realestate')
if not database_exists(engine.url):
    create_database(engine.url)

#drop table if exists
engine.execute("DROP TABLE IF EXISTS listing")
engine.execute("DROP TABLE IF EXISTS building")
engine.execute("DROP TABLE IF EXISTS offence_rate")
engine.execute("DROP TABLE IF EXISTS suburb")
engine.execute("DROP TABLE IF EXISTS lga")
engine.execute("DROP TABLE IF EXISTS year")

# create tables & constraints in SQL
# year table
engine.execute("CREATE TABLE year (year INT PRIMARY KEY)")
# lga table
engine.execute("CREATE TABLE lga (lga VARCHAR(100) PRIMARY KEY)")
# suburb table
engine.execute("CREATE TABLE suburb (\
                suburb VARCHAR(100) PRIMARY KEY,\
                lga VARCHAR(100) NOT NULL,\
                FOREIGN KEY (lga)\
                REFERENCES lga(lga))")
# offence rate table
engine.execute("CREATE TABLE offence_rate (\
                id SERIAL PRIMARY KEY,\
                year INT NOT NULL,\
                lga VARCHAR(100) NOT NULL,\
                crime_rate DECIMAL NOT NULL,\
                FOREIGN KEY (year)\
                REFERENCES year(year),\
                FOREIGN KEY (lga)\
                REFERENCES lga(lga))")
# building table
engine.execute("CREATE TABLE building (type VARCHAR(100) PRIMARY KEY)")
# listing table
engine.execute("CREATE TABLE listing (\
                id SERIAL PRIMARY KEY,\
                count INT NOT NULL,\
                type VARCHAR(100) NOT NULL,\
                bath INT NOT NULL,\
                bed INT NOT NULL,\
                car INT NOT NULL,\
                suburb VARCHAR(100) NOT NULL,\
                latitude DECIMAL NOT NULL,\
                longitude DECIMAL NOT NULL,\
                auction INT NOT NULL,\
                private_treaty INT NOT NULL,\
                prior_to_auction INT NOT NULL,\
                year INT NOT NULL,\
                price INT NOT NULL,\
                offence_count INT NOT NULL,\
                FOREIGN KEY (type)\
                REFERENCES building(type),\
                FOREIGN KEY (suburb)\
                REFERENCES suburb(suburb),\
                FOREIGN KEY (year)\
                REFERENCES year(year))")
# save data into SQL database
year.to_sql(name='year', con=engine, if_exists='append', index=False)
lga.to_sql(name='lga', con=engine, if_exists='append', index=False)
suburb.to_sql(name='suburb', con=engine, if_exists='append', index=False)
offence_rate.to_sql(name='offence_rate', con=engine, if_exists='append', index=False)
building.to_sql(name='building', con=engine, if_exists='append', index=False)
listing.to_sql(name='listing', con=engine, if_exists='append', index=False)