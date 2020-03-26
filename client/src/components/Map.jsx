import React, { useState, useEffect, useContext } from 'react';
import Context from '../context/Context'
import L from 'mapbox.js'
import countriesLayer from '../data/world'
import mapboxConfig from '../config/mapboxConfig.js'
import { navigate } from "@reach/router"

let map
let geojson

const Map = (props) => {
    const context = useContext(Context)
    const [highlightedCountry, setHighlightedCountry] = useState("")

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
    }, [])

    useEffect(() => {
        if (context.db) {
            // get countries data to get room count
            context.db.collection('countries').onSnapshot(countriesSnapshot => {
                let rooms = {}
                countriesSnapshot.forEach(country =>
                    rooms[country.id] = country.data().rooms.length
                )

                let countriesOnEachFeature = (feature, layer) => {
                    let country = feature.properties.name
                    let color = rooms[country] ? (rooms[country] === 1 ? 'palevioletred' : 'black') : ''
                    layer.on(
                        {
                            mouseover: highlightFeature,
                            mouseout: e => {
                                setHighlightedCountry("")
                                e.target.setStyle({ fillColor: color, opacity: 0.2, fillOpacity: 0.2 })
                            },
                            click: zoomToFeature
                        }
                    )
                    layer.setStyle({ fillColor: color, opacity: 0.2, fillOpacity: 0.2 })
                }
                if (geojson) {
                    geojson.remove()
                }
                geojson = L.geoJSON(countriesLayer, {
                    onEachFeature: countriesOnEachFeature
                }).addTo(map);
            })
        }
    }, [context.db])

    const highlightFeature = (e) => {
        let layer = e.target;
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

    const zoomToFeature = (clickEvent) => {
        let countryObject = clickEvent.target
        let countryName = countryObject.feature.properties.name
        let countryBounds = (countryObject.getBounds())

        map.fitBounds(countryBounds)
        if (countryName === "United States") {
            map.setView([38.68551, -99.49219], 5)
        } else if (countryName === "China") {
            map.setView([37.23033, 105.77637], 3)
        }
        else if (countryName === "Spain") {
            map.setView([40.66397, -3.40576], 6)
        }
        else if (countryName === "France") {
            map.setView([46.83013, 2.59277], 6)
        }
        else if (countryName === "Republic of Korea") {
            map.setView([35.88015, 127.97974], 7)
        }
        else {
            map.setView([16.541430, 7.558594], 2)
        }

        navigate(`/enter/${clickEvent.target.feature.properties.name}`)
    }


    return (
        <div>
            {/* {context.name?
            <div >Welcome {context.name}</div>:
            null} */}
            <div className="userName">Hello, {context.name}</div>
            <div className="countryName">{highlightedCountry}</div>
            <div className="container" id="map"></div>
        </div>
    )
}

export default Map

