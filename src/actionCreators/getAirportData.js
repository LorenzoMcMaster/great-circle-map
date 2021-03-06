import Papa from 'papaparse';

// This function is only called once, when the website first loads
// Fetch the data for all 8,300 airports, and put it into the redux store
export default function getAirportData() {
  return (dispatch, getState) => {
    const { airportData } = getState();

    if (airportData.length === 0) {
      Papa.parse('/airports.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: results => {
          dispatch({
            type: 'RECEIVE_AIRPORT_DATA',
            data: results.data
          });
        }
      });
    }
  };
}
