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
                let occupied = new Set()
                countriesSnapshot.forEach(country =>
                    country.exists ? (country.data().readRoom ? occupied.add(country.id) : null): null
                )

                let countriesOnEachFeature = (feature, layer) => {
                    let country = feature.properties.name
                    let color = occupied.has(country) ? ('navy') : ''
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

    const returnHandler = e =>{
        navigate('/')
        }
    return (
        <div>
            <div className="userName">{context.name}</div>
            <div className="countryName">{highlightedCountry}</div>
            <div className="container" id="map"></div>
            <div style={{ zIndex: '2', position: "fixed", bottom: '50px', left: '50px', position: 'absolute', border: "1px solid transparent", margin: "auto", width: '80px', height: '80px', borderRadius: "50%" }}>
                <div style={{ zoom: '270%' }} className={'x' + (context.avatar[0]).toString()}>
                    <img src={process.env.PUBLIC_URL + '/color_atlas.gif'} />
                </div>
                <div style={{ zoom: '270%' }} className={'y' + (context.avatar[1]).toString()}>
                    <img src={process.env.PUBLIC_URL + '/eyes_atlas.gif'} />
                </div>
                <div style={{ zoom: '150%' }} className={'z' + (context.avatar[2]).toString()}>
                    <img src={process.env.PUBLIC_URL + '/mouth_atlas.gif'} />
            </div>
            <div onClick={e=>returnHandler()} style={{zIndex: '2', position: "fixed", bottom: '-70%', left: '200%',position: 'absolute' }}>
            <img style={{width: '150px'}} src={process.env.PUBLIC_URL + '/speechBubble.png'} />
            <p style={{position: 'absolute', bottom: '36%', margin: '10px',  maxWidth: '180px', fontFamily: "'Chelsea Market', cursive", }}>Click this to change name and avatar</p>
            </div>


            </div>
        </div>
    )
}

export default Map

