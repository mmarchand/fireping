NodeJS rewrite of Smokeping \o/

Requirements
------------
Influxdb (any version >=1.0)
NodeJS (version 4 stable should do it)

Installation
------------

    npm install
    cp conf.js.default conf.js 

then edit conf.js to fit your install

Create your sqlite3 database:

    sqlite3 fireping.db
    > CREATE TABLE targets (id INTEGER PRIMARY KEY, target VARCHAR(15), hostname VARCHAR(255));

Run with :

    npm start 

there is a very basic web UI which is only used to add new targets to the sqlite3 db for now, use this link:
http://127.0.0.1:3000/targets/
or you can push them in DB directly of course

Use grafana to make beautiful graphs ;) (sample dashboard provided in grafana-dashboard.json file)
	-Create data sources with grafana website
	- go to http://127.0.0.1:3000 (Grafana website) => Dashboards => import => select json file grafana-dashboard.json
![Alt text](/fireping.png?raw=true "FirePing Dashboard")

FAQ
------------
1. Compilation error in NPM raw_socket during npm install

Make sure you use a recent enough g++ on your system

