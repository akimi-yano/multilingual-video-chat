import React, { useState, useEffect, useContext } from 'react';
import Context from '../context/Context'
// let L = require('mapbox');
import L from 'mapbox.js'
// import * as react-dom from 'react-dom'
import countriesLayer from '../data/world'
// import { Link } from 'react-router';
// import repositionMap from './utilities.jsx';
// import {browserHistory} from 'react-router'
import mapboxConfig from '../config/mapboxConfig.js'

import {navigate} from "@reach/router"


const Map = (props) => {
    const context = useContext(Context)
    let map

    const [highlightedCountry, setHighlightedCountry] = useState("")
    let geojson;


    useEffect(() => {
        map = L.map('map').setView([51.505, -50.50], 3);
        // let myMap = L.map("worldMap").setView([40, -74.50], 9);
        L.tileLayer('https://api.mapbox.com/styles/v1/{user_name}/{style_id}/tiles/256/{z}/{x}/{y}?access_token={mapboxAccessToken}', {
            attribution: 'Map data © <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery (c) <a href="https://www.mapbox.com/">Mapbox</a>',
            minZoom: 2,
            maxZoom: 4,
            style_id: "ck821b7f00to01iphoppryfrk",
            user_name: mapboxConfig.userName,
            mapboxAccessToken: mapboxConfig.accessToken,
        }).addTo(map);

    geojson = L.geoJSON(countriesLayer, {
        onEachFeature: countriesOnEachFeature
    }).addTo(map);

    geojson.setStyle({ opacity: 0, fillOpacity: 0 })
    }, [])

    const resetHighlight = (e) => {
        geojson.setStyle({ fillOpacity: 0 })
    }

    const zoomToFeature = (clickEvent) => {
        let countryObject = clickEvent.target
        let countryName = countryObject.feature.properties.name
        let countryBounds = (countryObject.getBounds())

        map.fitBounds(countryBounds)
        if (countryName==="United States"){
            map.setView([38.68551, -99.49219], 5)
        } else if (countryName==="China"){
            map.setView([37.23033, 105.77637], 3)
        }
        else if (countryName==="Spain"){
            map.setView([40.66397, -3.40576], 6)
        }
        else if (countryName==="France"){
            map.setView([46.83013, 2.59277], 6)
        }
        else if (countryName==="Republic of Korea"){
            map.setView([35.88015, 127.97974], 7)
        }
        else{
            map.setView([16.541430, 7.558594], 2)
        }

        navigate(`/transition/${clickEvent.target.feature.properties.name}`)
    }

    const countriesOnEachFeature = (feature, layer) => {
        layer.on(
            {
                mouseover: highlightFeature,
                mouseout: resetHighlight,
                click: zoomToFeature
            }
        )
    }

    const highlightFeature = (e) => {
        var layer = e.target;
        let country = layer.feature.properties.name

        setHighlightedCountry(country)

        layer.setStyle(
            {
                weight: 3,
                // fillColor: '#0082E6',
                fillColor: 'white',
                fillOpacity: 0.8
            }
        )
        if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
        }
    }


    return (
        <div>
            {context.name?
            <div>Welcome {context.name}</div>:
            null}
            <div className="countryName">{highlightedCountry}</div>
            <div className="container" id="map"></div>
        </div>
    )
}

export default Map

