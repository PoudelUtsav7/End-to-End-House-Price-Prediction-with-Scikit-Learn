// grab elements
const form        = document.getElementById('predict-form')
const submitBtn   = document.getElementById('submit-btn')
const resetBtn    = document.getElementById('reset-btn')
const spinner     = document.getElementById('spinner')
const btnLabel    = document.getElementById('btn-label')
const resultPanel = document.getElementById('result-panel')
const errorPanel  = document.getElementById('error-panel')
const resultPrice = document.getElementById('result-price')
const errorMsg    = document.getElementById('error-msg')

// API call
async function predict(data) {
  setLoading(true)
  resultPanel.style.display = 'none'
  errorPanel.style.display  = 'none'

  try {
    const response = await fetch('http://127.0.0.1:8000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.detail || 'Server error')
    }

    const result = await response.json()
    showResult(result.predicted_price, data)

  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      showError('Cannot connect to server. Is FastAPI running?')
    } else {
      showError(error.message)
    }
  } finally {
    setLoading(false)
  }
}

// form submit
form.addEventListener('submit', function(event) {
  event.preventDefault()

  const data = {
    latitude:           parseFloat(document.getElementById('latitude').value),
    longitude:          parseFloat(document.getElementById('longitude').value),
    housing_median_age: parseFloat(document.getElementById('housing_median_age').value),
    total_rooms:        parseFloat(document.getElementById('total_rooms').value),
    total_bedrooms:     parseFloat(document.getElementById('total_bedrooms').value),
    population:         parseFloat(document.getElementById('population').value),
    households:         parseFloat(document.getElementById('households').value),
    median_income:      parseFloat(document.getElementById('median_income').value),
    ocean_proximity:    document.getElementById('ocean_proximity').value,
  }

  if (data.total_bedrooms > data.total_rooms) {
    showError('Total bedrooms cannot be more than total rooms.')
    return
  }

  if (data.households > data.population) {
    showError('Households cannot be more than population.')
    return
  }

  predict(data)  // this is the only place predict() is called
})

// helper functions
function showError(message) {
  errorPanel.style.display  = 'block'
  resultPanel.style.display = 'none'
  errorMsg.textContent = message
}

function showResult(price, data) {
  resultPanel.style.display = 'block'
  errorPanel.style.display  = 'none'

  resultPrice.textContent = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(price)

  document.getElementById('meta-location').textContent =
    data.latitude + '°N  ' + Math.abs(data.longitude) + '°W'
  document.getElementById('meta-age').textContent    = data.housing_median_age
  document.getElementById('meta-income').textContent = data.median_income
}

function setLoading(isLoading) {
  if (isLoading) {
    spinner.style.display = 'block'
    btnLabel.textContent  = 'Predicting...'
    submitBtn.disabled    = true
  } else {
    spinner.style.display = 'none'
    btnLabel.textContent  = 'Predict Price →'
    submitBtn.disabled    = false
  }
}

function resetForm() {
  form.reset()
  resultPanel.style.display = 'none'
  errorPanel.style.display  = 'none'
}

// reset button
resetBtn.addEventListener('click', function() {
  resetForm()
})

// Slider sync functions
function syncSlider(fieldId, value, suffix) {
  const num = parseFloat(value)
  document.getElementById(fieldId).value = num
  const display = document.getElementById(fieldId + '-display')
  if (display) display.textContent = num.toFixed(2).replace('.00', '') + suffix
}

function syncNumber(fieldId, value, suffix) {
  const num = parseFloat(value)
  if (isNaN(num)) return
  document.getElementById(fieldId + '-slider').value = num
  const display = document.getElementById(fieldId + '-display')
  if (display) display.textContent = num.toFixed(2).replace('.00', '') + suffix
}

function resetForm() {
  form.reset()
  resultPanel.style.display = 'none'
  errorPanel.style.display  = 'none'

  // reset all slider displays
  syncSlider('latitude',            '34',    '°')
  syncSlider('longitude',           '-118',  '°')
  syncSlider('housing_median_age',  '20',    ' yrs')
  syncSlider('total_rooms',         '2000',  '')
  syncSlider('total_bedrooms',      '400',   '')
  syncSlider('population',          '1200',  '')
  syncSlider('households',          '450',   '')
  syncSlider('median_income',       '3.5',   '×$10k')
}