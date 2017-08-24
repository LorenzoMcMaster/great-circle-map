import React, { Component } from "react"
import { connect } from "react-redux"
import PropTypes from "prop-types"
import { geoOrthographic, geoPath, geoDistance, geoGraticule } from "d3-geo"
import { scaleLinear } from "d3-scale"
import { getAirports, getSectors, getGlobePosition } from "../../selectors"
import getPixelPositions from "./utils/getPixelPositions"

class SvgMap extends Component {
  constructor(props) {
    super(props)
    this.state = {
      mouseDownLambda: null,
      mouseDownPhi: null,
      lambda: props.globePosition.lambda,
      phi: props.globePosition.phi
    }

    this.diameter = 600
    this.projection = geoOrthographic()
      .scale(this.diameter / 2)
      .translate([this.diameter / 2, this.diameter / 2])
      .clipAngle(90)

    this.lambdaScale = scaleLinear()
        .domain([0, this.diameter])
        .range([-90, 90])

    this.phiScale = scaleLinear()
        .domain([0, this.diameter])
        .range([90, -90])

    this.handleMouseDown = this.handleMouseDown.bind(this)
    this.handleMouseUp = this.handleMouseUp.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleTouchStart = this.handleTouchStart.bind(this)
    this.handleTouchMove = this.handleTouchMove.bind(this)
  }

  componentWillReceiveProps({ sectors, globePosition, routeColor }) {
    if (sectors.length && routeColor === this.props.routeColor) {
      const { lambda, phi } = globePosition
      this.setState({ lambda, phi })
    }
  }

  handleMouseDown(event) {
    event.preventDefault()
    const { dispatch } = this.props
    const x = event.clientX
    const y = event.clientY
    this.setState({
      mouseDownLambda: this.lambdaScale(x) - this.state.lambda,
      mouseDownPhi: this.phiScale(y) - this.state.phi
    })
    dispatch({ type: "MOUSE_DOWN" })
  }

  handleMouseUp() {
    this.setState({ mouseDownLambda: null, mouseDownPhi: null })
  }

  handleMouseMove(event) {
    const { dispatch } = this.props
    if (this.state.mouseDownLambda) {
      const lambda = this.lambdaScale(event.clientX) - this.state.mouseDownLambda

      if ((this.phiScale(event.clientY) - this.state.mouseDownPhi) < -65) {
        this.setState({ mouseDownPhi: this.phiScale(event.clientY) + 65 })
      } else if ((this.phiScale(event.clientY) - this.state.mouseDownPhi) > 65) {
        this.setState({ mouseDownPhi: this.phiScale(event.clientY) - 65 })
      }
      let phi = this.phiScale(event.clientY) - this.state.mouseDownPhi

      if (phi < -65) {
        phi = -65
      } else if (phi > 65) {
        phi = 65
      }
      this.setState({ lambda, phi })
      dispatch({ type: "MOUSE_MOVE" })
    }
  }

  handleTouchStart(event) {
    const x = event.touches[0].clientX
    const y = event.touches[0].clientY
    this.setState({
      mouseDownLambda: this.lambdaScale(x) - this.state.lambda,
      mouseDownPhi: this.phiScale(y) - this.state.phi
    })
  }

  handleTouchMove(event) {
    this.handleMouseMove(event.touches[0])
  }

  render() {
    const { lambda, phi } = this.state
    this.projection.rotate([lambda, phi])
    const path = geoPath()
      .projection(this.projection)
      .pointRadius(3)

    const { mapData, label, airports, sectors, routeColor } = this.props
    const pixelPositions = getPixelPositions(airports, this.projection, lambda, phi)

    return (
      <div id="svg-wrapper">
        <svg
          id="svg"
          viewBox={`-25 -25 ${this.diameter + 50} ${this.diameter + 50}`}
          onTouchStart={this.handleTouchStart}
          onMouseDown={this.handleMouseDown}
          onTouchEnd={this.handleMouseUp}
          onMouseUp={this.handleMouseUp}
          onTouchMove={this.handleTouchMove}
          onMouseMove={this.handleMouseMove}
        >
          <defs>
            <radialGradient id="ocean-gradient" cx="65%" cy="20%">
              <stop offset="0%" stopColor="#799" />
              <stop offset="100%" stopColor="#368" />
            </radialGradient>
          </defs>
          <defs>
            <radialGradient id="land-gradient" cx="65%" cy="20%">
              <stop offset="0%" stopColor="#765" />
              <stop offset="100%" stopColor="#543" />
            </radialGradient>
          </defs>
          <circle
            r={this.diameter / 2}
            cx={this.diameter / 2}
            cy={this.diameter / 2}
            fill="url(#ocean-gradient)"
          />
          <path className="svg-land" d={path(mapData)} fill="url(#land-gradient)" />
          <path id="graticule" d={path(geoGraticule()())} />
          <g>
            {airports.map((airport, i) => (
              <g key={airport.id}>
                <path
                  fill={routeColor}
                  d={path({ type: "Point", coordinates: [airport.lng, airport.lat] })}
                />
                {label !== "none" && geoDistance(
                  [airport.lng, airport.lat],
                  [-this.state.lambda, -this.state.phi]
                ) < (Math.PI / 2) ?
                  <text
                    x={pixelPositions[i].x}
                    y={pixelPositions[i].y}
                    textAnchor={pixelPositions[i].textAnchor}
                    className="svg-label"
                  >
                    {airport[label] || airport.iata || airport.icao}
                  </text>
                  : null
                }
              </g>
            ))}
          </g>
          <g>
            {sectors.map(sector => (
              <path
                stroke={routeColor}
                fill="none"
                d={path({
                  type: "LineString",
                  coordinates: [[sector[0].lng, sector[0].lat], [sector[1].lng, sector[1].lat]]
                })}
                key={`${sector[0].id}-${sector[1].id}`}
              />
            ))}
          </g>
        </svg>
      </div>
    )
  }
}
function mapStateToProps(state) {
  return {
    routes: state.routes,
    sectors: getSectors(state),
    airports: getAirports(state),
    globePosition: getGlobePosition(state),
    mapData: state.svgMap,
    label: state.settings.label.value,
    routeColor: state.settings.routeColor
  }
}

SvgMap.propTypes = {
  dispatch: PropTypes.func.isRequired,
  mapData: PropTypes.shape({ geometry: PropTypes.object }).isRequired,
  label: PropTypes.string.isRequired,
  sectors: PropTypes.arrayOf(PropTypes.array).isRequired,
  airports: PropTypes.arrayOf(PropTypes.object).isRequired,
  routeColor: PropTypes.string.isRequired,
  globePosition: PropTypes.shape({
    lambda: PropTypes.number,
    phi: PropTypes.number
  }).isRequired
}

export default connect(mapStateToProps)(SvgMap)
