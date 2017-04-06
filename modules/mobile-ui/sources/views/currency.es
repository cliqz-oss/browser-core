import CliqzUtils from 'core/utils';

function getNumValue(value) {
    return (isNaN(value) || value <= 0 ? 0 : value - 0); // rounding value
}

function updateCurrencyTpl(data) {
    document.getElementById("currency-tpl").innerHTML = CLIQZ.templates.currency({data: data});
}

export default class {
    enhanceResults(data) {
    }

    switchCurrency(data) {
        var fromInput = document.getElementById("fromInput");

        var convRate = 1 / data.extra.mConversionRate;
        data.extra.mConversionRate = convRate + "";
        convRate *= data.extra.multiplyer;
        var fromValue = getNumValue(parseFloat(fromInput.value));
        data.extra.toAmount.main = getNumValue(fromValue * convRate);
        data.extra.fromAmount = fromValue;

        var temp = data.extra.fromCurrency;
        data.extra.fromCurrency = data.extra.toCurrency;
        data.extra.toCurrency = temp;

        temp = data.extra.formSymbol;
        data.extra.formSymbol = data.extra.toSymbol;
        data.extra.toSymbol = temp;

        data.extra.multiplyer = 1 / data.extra.multiplyer;

        updateCurrencyTpl(data);
    }

    updateFromValue(data) {
        var fromInput = document.getElementById("fromInput");
        var toInput = document.getElementById("toInput");
        var toAmount = document.getElementById("calc-answer");
        var toValue = getNumValue(fromInput.value / data.extra.multiplyer * data.extra.mConversionRate).toFixed(2) - 0;
        toAmount.innerText = toValue.toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
        toInput.value = toValue;
    }

    updateToValue(data) {
        var fromInput = document.getElementById("fromInput");
        var toInput = document.getElementById("toInput");
        var toAmount = document.getElementById("calc-answer");
        var toValue = getNumValue(toInput.value);
        var fromValue = getNumValue(toValue * data.extra.multiplyer / data.extra.mConversionRate).toFixed(2);
        toAmount.innerText = toValue.toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
        fromInput.value = fromValue;
    }
};
