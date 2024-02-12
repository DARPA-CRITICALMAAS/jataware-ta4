
import React, { useState } from 'react';

import { returnImageUrl } from "./helpers"

const TIFF_URL = import.meta.env.VITE_TIFF_URL;
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
const BUFFER = 200;

function SmallMapImage({ map_id, gcp }) {
    const [clipUrl, setClipUrl] = useState(returnImageUrl(map_id, gcp))

    function returnColor(arr) {
        return `rgb(${arr[0]},${arr[1]},${arr[2]} )`
    }
    function returnHeight() {
        return "220px"
    }

    return (
        <>
            {clipUrl &&
                <div
                    className='borderBox'
                    style={{
                        display: "grid",
                        justifyContent: "center",
                        alignContent: "center",
                        width: returnHeight(),
                        height: "220px",
                        background: returnColor(gcp.color)
                    }}>
                    <img
                        src={clipUrl}
                        alt="Loading Clipped Map..."
                        style={{

                            width: '200px',
                            height: '200px',
                            cursor: 'pointer'
                        }}
                    />
                </div>
            }
        </>
    )
}
export default SmallMapImage;