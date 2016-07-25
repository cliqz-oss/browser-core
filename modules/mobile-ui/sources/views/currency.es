function getNumValue(value) {
    return (isNaN(value) || value <= 0 ? 0 : value - 0); // rounding value
}

function updateCurrencyTpl(data) {
    document.getElementById("currency-tpl").innerHTML = CliqzHandlebars.tplCache.currency({data: data});
}

export default class {
    enhanceResults(data) {
    }

    switchCurrency(data) {
        var fromInput = document.getElementById("fromInput");

        var convRate = 1 / data.mConversionRate;
        data.mConversionRate = convRate + "";
        convRate *= data.multiplyer;
        var fromValue = getNumValue(parseFloat(fromInput.value));
        data.toAmount.main = getNumValue(fromValue * convRate);
        data.fromAmount = fromValue;

        var temp = data.fromCurrency;
        data.fromCurrency = data.toCurrency;
        data.toCurrency = temp;

        temp = data.formSymbol;
        data.formSymbol = data.toSymbol;
        data.toSymbol = temp;

        data.multiplyer = 1 / data.multiplyer;

        updateCurrencyTpl(data);
    }

    updateFromValue(data) {
        var fromInput = document.getElementById("fromInput");
        var toInput = document.getElementById("toInput");
        var toAmount = document.getElementById("calc-answer");
        var toValue = getNumValue(fromInput.value / data.multiplyer * data.mConversionRate).toFixed(2) - 0;
        toAmount.innerText = toValue.toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
        toInput.value = toValue;
    }

    updateToValue(data) {
        var fromInput = document.getElementById("fromInput");
        var toInput = document.getElementById("toInput");
        var toAmount = document.getElementById("calc-answer");
        var toValue = getNumValue(toInput.value);
        var fromValue = getNumValue(toValue * data.multiplyer / data.mConversionRate).toFixed(2);
        toAmount.innerText = toValue.toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
        fromInput.value = fromValue;
    }
};
