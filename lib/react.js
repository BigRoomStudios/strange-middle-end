'use strict';

const React = require('react');

const Context = React.createContext();

Context.displayName = 'StrangeMiddleEnd';

exports.Provider = function Provider({ middleEnd, children }) {

    if (!middleEnd || !middleEnd.initialized) {
        throw new Error(
            'StrangeMiddleEnd.Provider received an unitialized middle-end. Please pass an initialized middle-end.'
        );
    }

    return React.createElement(Context.Provider, {
        value: middleEnd
    }, children);
};

exports.useMiddleEnd = function useMiddleEnd() {

    const m = React.useContext(Context);
    if (!m) {
        throw new Error(
            'No middle-end found. Make sure this component is wrapped in strange-middle-end\'s <Provider>.'
        );
    }

    return m;
};
