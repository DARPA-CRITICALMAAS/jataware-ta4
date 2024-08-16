
/* Three (3) Shapes
   One Polygon, One MultiPolygon, One LineString.
coordinates don't actually enclose a full polygon, as I reduced the file coordinates
But these examples should be enough to perform transformations we need
*/

export default [
  [
    [
      {
        "type": "Feature",
        "properties": {
          "OBJECTID_1": 1,
          "PERIMETER": 2882760,
          "REGION": "SB",
          "AREA_SQKM": 245059,
          "Shape_Leng": 2646213.04929,
          "Shape_Area": 245058854055,
          "NAME": "Southern Basin and Range"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                -1554528.8848,
                5254.913300000131
              ],
              [
                -1549016.0135999992,
                4828.82880000025
              ],
              [
                -1543482.2633999996,
                4923.256599999964
              ]
            ]
          ]
        }
      }
    ],
    "PROJCS[\"USA_Contiguous_Albers_Equal_Area_Conic\",GEOGCS[\"GCS_North_American_1983\",DATUM[\"D_North_American_1983\",SPHEROID[\"GRS_1980\",6378137.0,298.257222101]],PRIMEM[\"Greenwich\",0.0],UNIT[\"Degree\",0.0174532925199433]],PROJECTION[\"Albers\"],PARAMETER[\"False_Easting\",0.0],PARAMETER[\"False_Northing\",0.0],PARAMETER[\"Central_Meridian\",-96.0],PARAMETER[\"Standard_Parallel_1\",29.5],PARAMETER[\"Standard_Parallel_2\",45.5],PARAMETER[\"Latitude_Of_Origin\",37.5],UNIT[\"Meter\",1.0]]"
  ],
  [
    [
      {
        "type": "Feature",
        "properties": {
          "AFFGEOID": "0100000US",
          "GEOID": "US",
          "NAME": "United States"
        },
        "geometry": {
          "type": "MultiPolygon",
          "coordinates": [
            [
              [
                [
                  2.291863239086439,
                  48.8577137262115
                ],
                [
                  2.293452085617105,
                  48.856693553273885
                ],
                [
                  2.2968403487010107,
                  48.85892279314069
                ]
              ]
            ],
            [
              [
                [
                  2.288226120523035,
                  48.86156752523257
                ],
                [
                  2.2899681088877344,
                  48.86042149181674
                ],
                [
                  2.290810388976098,
                  48.86063558796482
                ]
              ]
            ]
          ]

        }
      }
    ],
    "PROJCS[\"USA_Contiguous_Albers_Equal_Area_Conic\",GEOGCS[\"GCS_North_American_1983\",DATUM[\"D_North_American_1983\",SPHEROID[\"GRS_1980\",6378137.0,298.257222101]],PRIMEM[\"Greenwich\",0.0],UNIT[\"Degree\",0.0174532925199433]],PROJECTION[\"Albers\"],PARAMETER[\"False_Easting\",0.0],PARAMETER[\"False_Northing\",0.0],PARAMETER[\"Central_Meridian\",-96.0],PARAMETER[\"Standard_Parallel_1\",29.5],PARAMETER[\"Standard_Parallel_2\",45.5],PARAMETER[\"Latitude_Of_Origin\",37.5],UNIT[\"Meter\",1.0]]"
  ],
  [
    [
      {
        "type": "Feature",
        "properties": {
        },
        "geometry": {
          "type": "LineString",
          "coordinates": [
            [
              [
                -1554528.8848,
                5254.913300000131
              ],
              [
                -1549016.0135999992,
                4828.82880000025
              ],
              [
                -1543482.2633999996,
                4923.256599999964
              ]
            ]
          ]
        }
      }
    ],
    ""
  ]
]
