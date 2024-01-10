// mapExtraction.tsx

import React, { useEffect, useRef, useState } from 'react';

import Map from 'ol/Map.js';

import TileLayer from 'ol/layer/WebGLTile.js';

import { Vector as VectorLayer } from 'ol/layer.js';
import XYZ from 'ol/source/XYZ.js';
import GeoTIFF from 'ol/source/GeoTIFF.js';
import { Vector as VectorSource } from 'ol/source.js';

import View from 'ol/View.js';

import { useNavigate } from "react-router-dom";

import axios from 'axios';

import { Button, Modal, Switch } from '@mui/material';
import { Card, CardContent, Grid, Typography, Slider, Box, Link } from '@mui/material';

import "../css/georefViewer.css";
import SmallMapImage from './smallMapImage'
import SmallMapImageClipped from './smallMapImageClipped'
import { register_proj, getLayerById, valuetext, basemapURLS, handleOpacityChange, loadWMTSLayer } from "./helpers"

import { transform, get as getProjection } from 'ol/proj';

import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

import Draw, { createBox } from 'ol/interaction/Draw'
import { getCenter } from 'ol/extent';
import { Select, MenuItem } from '@mui/material';


// Params
const TIFF_URL = import.meta.env.VITE_TIFF_URL;
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

const _APP_JSON_HEADER = {
    "Access-Control-Allow-Origin": "*",
    'Content-Type': 'application/json',
}

function MapPage({ mapData }) {
    console.log('Map data', mapData)
    const navigate = useNavigate();
    const map_name = mapData['map_info']['map_id']
    const map_id = mapData['map_info']['map_id']

    document.title = "Nylon Georeferencer Projections -" + map_name;

    const [map, setMap] = useState()
    const mapTargetElement = useRef<HTMLDivElement>(null)
    const proj_index = useRef(0)
    const [gcps, setGCPS] = useState(mapData['proj_info'][0]['gcps'])
    const mapRef = useRef()
    const currZoomRef = useRef()

    let draw;
    const drawRef = useRef()
    const clippedExtentIndex = useRef(0)
    const [clippedState, setClippedState] = useState({
        "clipExentRef": null,
        "clippedCenter": null,
        "clippedProjection": null
    })

    const [openReview, setOpenReview] = useState(false);

    const [showGCPs, setShowGCPs] = useState(true);
    const [showClippedMaps, setShowClippedMaps] = useState(false)
    const [showButtonForClip, setShowButtonForClip] = useState(false)

    const baseMapSwitchRef = useRef({})
    const [baseMapSwitch, setBaseMapSwitch] = useState()
    const [baseMapSources, setBaseMapSources] = useState()

    const [baseSelected, setBaseSelected] = useState('Satellite');


    const currCenterRef = useRef([mapData['proj_info'][0]['gcps'][0]['x'], mapData['proj_info'][0]['gcps'][0]['y']])

    const [currentProj, setCurrentProj] = useState(mapData['proj_info'][0]['epsg_code'])
    const Proj_Ref = useRef(mapData['proj_info'][0]['epsg_code'])

    const handleClose = () => {
        setOpenReview(false);
    };

    // add clip layer for comparing projections
    const clip_source = new VectorSource({ wrapX: false });
    const clip_layer = new VectorLayer({
        id: "bounding-box",
        source: clip_source,
    });


    const map_source = new GeoTIFF({
        sources: [
            {
                url: `${TIFF_URL}/cogs/${map_id}/${map_id}_${mapData['proj_info'][proj_index.current]['proj_id']}.pro.cog.tif`,
                nodata: 0,
            }
        ],
        convertToRGB: true,
        interpolate: false,
    });

    const map_layer = new TileLayer({
        id: "map-layer",
        source: map_source,
    })


    // BASE layer

    const base_source = new XYZ({
        url: `https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
        crossOrigin: '',
    });

    const base_layer = new TileLayer({
        id: "Satellite",
        source: base_source,
        visible: true
    });
    const XYZ_base_layers = { "Satellite": base_layer };
    const XYZ_source_layers = { "Satellite": base_source }
    // historic base layer

    async function register_projs(codes) {
        for (let code of codes) {
            await register_proj(code)
        }
    }

    async function buildWMTSBaseLayers() {
        let allWMTSBaseLayers = {}
        let allWMTSSourceLayers = {}
        for (let url of basemapURLS) {
            let [resp, sources] = await loadWMTSLayer(url)
            allWMTSBaseLayers = { ...allWMTSBaseLayers, ...resp };
            allWMTSSourceLayers = { ...allWMTSSourceLayers, ...sources };

        };
        return [allWMTSBaseLayers, allWMTSSourceLayers]
    }

    async function waitForProjections(codes) {
        try {
            await register_projs(codes);
        } catch (error) {
            console.error("An error occurred:", error);
        }
    }


    // Render map
    useEffect(() => {

        let codes = ["EPSG:4267", "EPSG:26711"]
        for (let proj_ of mapData['proj_info']) {
            codes.push(proj_['epsg_code'])
        }

        waitForProjections(codes)
            .then(() => {
                console.log('Projections loaded successfully');

                return buildWMTSBaseLayers()
            }).then(([WMTS_base_layers, WMTS_source_layers]) => {
                var sourceProjection = getProjection(mapData['proj_info'][0]['gcps'][0]['crs']);
                var targetProjection = getProjection(mapData['proj_info'][proj_index.current]['epsg_code']);
                let all_layers = [
                    ...Object.values(XYZ_base_layers),
                    ...Object.values(WMTS_base_layers),
                    map_layer,
                    clip_layer
                ]
                baseMapSwitchRef.current = { ...XYZ_base_layers, ...WMTS_base_layers }
                setBaseMapSwitch({ ...XYZ_base_layers, ...WMTS_base_layers })
                setBaseMapSources({ ...WMTS_source_layers })
                const map = new Map({
                    layers: all_layers,
                    view: new View({
                        center: transform(currCenterRef.current, sourceProjection, targetProjection),
                        zoom: 10,
                        projection: mapData['proj_info'][proj_index.current]['epsg_code']
                    })
                })
                currZoomRef.current = map.getView().getZoom();

                map.on('moveend', function (e) {
                    var newZoom = map.getView().getZoom();
                    var newCenter = map.getView().getCenter();

                    if (currZoomRef.current != newZoom) {
                        currZoomRef.current = newZoom;
                    }
                    if (currCenterRef.current != newCenter) {
                        currCenterRef.current = newCenter
                    }
                });

                // set Target
                map.setTarget(mapTargetElement.current || "");

                draw = new Draw({
                    source: clip_source,
                    type: "Circle",
                    geometryFunction: createBox(),

                });
                draw.on('drawend', function () {
                    updateClippedState(-1)
                    setShowButtonForClip(true)
                });
                draw.setActive(false)
                drawRef.current = draw
                map.addInteraction(draw);

                // set map ref to map
                mapRef.current = map
            })

        return
    }, [])



    function nextProjection(projIndex = null) {
        // update projection index
        let old_proj = currentProj

        if (projIndex != null) {
            proj_index.current = projIndex
        } else if (proj_index.current >= mapData['proj_info'].length - 1) {
            proj_index.current = 0
        } else {
            proj_index.current = proj_index.current + 1
        }

        // new map source 
        const new_map_source = new GeoTIFF({
            sources: [
                {
                    url: `${TIFF_URL}/cogs/${map_id}/${map_id}_${mapData['proj_info'][proj_index.current]['proj_id']}.pro.cog.tif`,
                    nodata: 0,
                }
            ],
            convertToRGB: true,
        })

        // update view to new projection view
        let proj_ = mapData['proj_info'][proj_index.current]['epsg_code']

        setCurrentProj(proj_)
        const newView = new View({
            center: currCenterRef.current,
            zoom: 10,
            projection: proj_
        })

        mapRef.current.setView(newView)
        Proj_Ref.current = proj_
        // set map layer to new source
        getLayerById(mapRef.current, "map-layer").setSource(new_map_source);

        setGCPS([...mapData['proj_info'][proj_index.current]['gcps']])


        var sourceProjection = getProjection(old_proj);
        var targetProjection = getProjection(proj_);
        newView.setCenter(transform(currCenterRef.current, sourceProjection, targetProjection))
        newView.setZoom(currZoomRef.current)

    }

    function saveProjStatus(map_id, proj_id, status) {
        axios({
            method: 'post',
            url: "/api/map/proj_info",
            data: {
                "map_id": map_id,
                "proj_id": proj_id,
                "status": status
            },
            headers: _APP_JSON_HEADER
        }).then((response) => {
            handleClose();
            if (status == "success") {
                next()
            } else {
                setTimeout(() => {
                    window.location.reload()
                }, 2000);

            }
        }).catch((e) => {
            alert(e)
        })

    }

    function next() {
        axios({
            method: "get",
            url: "/api/map/random",
            params: { "georeferenced": true },
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
        })
            .then((response) => {
                let data = response.data;
                navigate("../projections/" + data["map"]);
                navigate(0);
            })
            .catch((error) => {
                console.error("Error fetching data:", error);
            });
    }

    const switchRightPanel = () => {
        setShowGCPs(!showGCPs);
        drawRef.current.setActive(showGCPs)
        if (!showGCPs) {
            let layer_source = getLayerById(mapRef.current, "bounding-box").getSource()
            layer_source.clear()
            setShowClippedMaps(false)
            setClippedState(clippedState => ({
                ...clippedState,
                "clipExentRef": null,
                "clippedCenter": null,
                "clippedProjection": null
            }))
            setShowButtonForClip(false)
        }
    };

    function updateClippedState(clippedIndex) {

        let features = getLayerById(mapRef.current, "bounding-box").getSource().getFeatures()

        var sourceProjection = mapRef.current.getView().getProjection()

        if (features.length > 0) {
            let feature = features.slice(clippedIndex)[0]
            let extent = feature.getGeometry().extent_
            setClippedState(clippedState => ({
                ...clippedState,
                "clipExentRef": extent,
                "clippedCenter": getCenter(extent),
                "clippedProjection": sourceProjection
            }))
        }
    }

    function viewClippedArea() {
        updateClippedState(0)
        setShowClippedMaps(true)
    }

    function clearClippedArea() {
        //clear polygons
        getLayerById(mapRef.current, "bounding-box").getSource().clear()

        //update state
        setClippedState(clippedState => ({
            ...clippedState,
            "clipExentRef": null,
            "clippedCenter": null,
            "clippedProjection": null
        }))
        setShowButtonForClip(false)
        setShowClippedMaps(false)
    }

    function nextClippedPolygon(i = null) {
        let length = getLayerById(mapRef.current, "bounding-box").getSource().getFeatures().length
        if (i != null) {
            clippedExtentIndex.current = i
        } else if (clippedExtentIndex.current >= length - 1) {
            clippedExtentIndex.current = 0
        } else {
            clippedExtentIndex.current = clippedExtentIndex.current + 1
        }
        updateClippedState(clippedExtentIndex.current)
    }


    const handleBaseChange = (event) => {
        setBaseSelected(event.target.value);
        changedBaseMap(event.target.value);
    };


    function changedBaseMap(key) {
        for (let key_ of Object.keys(baseMapSwitch)) {
            if (key == key_) {
                getLayerById(mapRef.current, key_).setVisible(true);

            } else {
                getLayerById(mapRef.current, key_).setVisible(false);
            }
        }
    }


    return (
        <>
            <Modal
                open={openReview}
                onClose={handleClose}
                aria-labelledby="modal-title"
                aria-describedby="modal-description"
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 400,
                        bgcolor: 'background.paper',
                        border: '2px solid #000',
                        boxShadow: 24,
                        p: 4,
                    }}
                >
                    <Typography id="modal-description" variant="body1" mb={2}>
                        "Success" means this is the correct projection.
                        "Failed" means it was not correct and should be discarded.
                    </Typography>
                    <Button
                        color="success"
                        onClick={(e) => saveProjStatus(
                            mapData['map_info']['map_id'],
                            mapData['proj_info'][proj_index.current]["proj_id"],
                            "success")}>
                        Projection Succeeded
                    </Button>
                    <Button
                        color="error"
                        onClick={(e) => saveProjStatus(
                            mapData['map_info']['map_id'],
                            mapData['proj_info'][proj_index.current]["proj_id"],
                            "failed")}>
                        Projection Failed
                    </Button>
                </Box>
            </Modal>

            <div className="flex-container" >
                <div className="flexChild">
                    <div className="control_panel" id="control-panel">
                        <Box sx={{ width: 220 }}>
                            <Typography id="continuous-slider" gutterBottom>
                                Map Opacity
                            </Typography>
                            <Slider
                                aria-label="Continuous slider"
                                defaultValue={100}
                                step={10}
                                valueLabelDisplay="auto"
                                onChange={(e) => handleOpacityChange(e, mapRef.current)}
                                valueLabelFormat={valuetext}
                            />

                            {baseMapSwitch &&

                                <Select value={baseSelected} onChange={handleBaseChange} displayEmpty
                                    style={{ margin: "5px" }}>
                                    <MenuItem value="" disabled>Select an Option</MenuItem>
                                    {Object.keys(baseMapSwitch).map((key) => (
                                        <MenuItem key={key} value={key}>{key}</MenuItem>
                                    ))}
                                </Select>
                            }

                        </Box>
                    </div>
                    <div
                        ref={mapTargetElement}
                        className="map"
                        style={{
                            width: "100%",
                            height: "100%",
                            position: "relative",
                        }} />
                </div >
                <div className="flexChild scrollableContent">
                    <div className="left-panel">

                        <Button onClick={(e) => { navigate("/"); navigate(0); }}>Home</Button>
                        <Button onClick={(e) => nextProjection()}>Next Projection ({String(proj_index.current + 1)}/{mapData['proj_info'].length})</Button>
                        <Button
                            color="warning"
                            onClick={(e) => { navigate("/points/" + mapData['map_info']['map_id']); navigate(0); }}>
                            Redo From Scratch
                        </Button>
                        <Button
                            className="nextButton"
                            color="success"
                            onClick={() => setOpenReview(true)}
                        >
                            Review Map
                        </Button>

                        <Button
                            className="nextButton"
                            color="primary"
                            onClick={() => next()}
                        >
                            Next Map
                        </Button>
                        <br />
                        <Link href={`${TIFF_URL}/cogs/${map_name}/${map_name}_${mapData['proj_info'][proj_index.current]['proj_id']}.pro.cog.tif`}>DOWNLOAD PROJECTION</Link>

                        <Typography variant="body2" style={{ fontSize: "1.2rem", marginBottom: "5px" }}>
                            Projection code: {mapData['proj_info'][proj_index.current]['epsg_code']}
                        </Typography>
                        <FormControlLabel control={<Switch checked={!showGCPs} onChange={() => { switchRightPanel() }} />} label={showGCPs ? "Compare Clipped Areas" : "View GCPs"} />

                        <div>
                            {showGCPs ?
                                <>
                                    {gcps &&
                                        gcps.map((gcp, i) => {
                                            return <div key={gcp.gcp_id}>
                                                <div className="container_card">
                                                    <GCPCardSummary gcp={gcp} />
                                                    <SmallMapImage map_name={map_name} gcp={gcp} />
                                                </div>
                                            </div>
                                        })
                                    }
                                </>
                                :
                                <>
                                    {showButtonForClip == true ?
                                        <>
                                            <Button onClick={() => { viewClippedArea() }}>Process Clipped Area</Button>
                                            <Button onClick={() => { clearClippedArea() }}>Clear</Button>
                                            <Button onClick={() => { nextClippedPolygon() }}>Next Clipped Polygon</Button>
                                        </>
                                        :
                                        <p>Select an area to view for all projections</p>
                                    }

                                    {showClippedMaps &&
                                        mapData['proj_info'].map((proj_info, i) => {
                                            return <div key={proj_info.proj_id}>
                                                <div className="container_card">
                                                    <SmallMapImageClipped
                                                        map_id={map_id}
                                                        proj_info={proj_info}
                                                        clippedState={clippedState}
                                                        baseMapSources={baseMapSources}
                                                        parentBaseMap={baseSelected}
                                                    />
                                                    <Button onClick={() => nextProjection(i)}>View in Main Window</Button>
                                                </div>
                                            </div>
                                        })
                                    }
                                </>
                            }
                        </div>
                    </div>
                </div>
            </div >
        </>
    )
}

export default MapPage;

function GCPCardSummary({ gcp }) {
    return (
        <Card variant="outlined" className="card" style={{ padding: '8px' }}>
            <CardContent>
                <Typography variant="body2" style={{ fontSize: "1.2rem", marginBottom: "5px" }}>
                    <b>CRS:</b> {gcp.crs}
                </Typography>
                <Grid>
                    <Grid item xs={4}>
                        <Typography variant="caption" display="block" gutterBottom style={{ fontWeight: 'bold', fontSize: "1.2rem" }}>
                            Coords DMS:
                        </Typography>
                        <Typography variant="body2" style={{ fontSize: '1.2rem', backgroundColor: "#E0E0E0", borderRadius: "10px", padding: "10px" }}>
                            <>X: {LocationInput("x_dms", gcp)} , </>
                            <>Y: {LocationInput("y_dms", gcp)} </>
                        </Typography>
                    </Grid>
                </Grid>
            </CardContent>
        </Card >
    );
}

function LocationInput(input_label, gcp) {
    const [degree, setDegree] = useState('');
    const [minute, setMinute] = useState('');
    const [second, setSecond] = useState('');

    useEffect(() => {
        let dms = null
        if (input_label == "y_dms") {
            dms = gcp['y_dms']
        } else {
            dms = gcp['x_dms']
        }
        if (dms != null) {
            setDegree(dms.split("°")[0].trim())
            setMinute(dms.split("°")[1].split("'")[0].trim())
            setSecond(dms.split("'")[1].split('"')[0].trim())
        }
    }, [gcp])

    return <>{degree + "°" + minute + "'" + second + '"'}</>

}

