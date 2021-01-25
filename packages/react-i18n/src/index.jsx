/**
 * WordPress dependencies
 */
import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useReducer,
} from '@wordpress/element';
import { createHigherOrderComponent } from '@wordpress/compose';
import { createHooks, defaultHooks } from '@wordpress/hooks';
import { defaultI18n } from '@wordpress/i18n';

/** @typedef {import('@wordpress/i18n').I18n} I18n */
/** @typedef {import('@wordpress/hooks').Hooks} Hooks */

const I18nContext = createContext(
	makeContextValue( defaultI18n, defaultHooks )
);

export const I18nProvider = ( { children, i18n = defaultI18n } ) => {
	const hooks = useMemo( createHooks, [] );

	const [ update, forceUpdate ] = useReducer( () => [], [] );

	// rerender translations whenever a hook is removed or added
	useEffect( () => {
		hooks.addAction( 'hookAdded', 'core/react-i18n/filters', () =>
			forceUpdate()
		);
		hooks.addAction( 'hookRemoved', 'core/react-i18n/filters', () =>
			forceUpdate()
		);
		return () => {
			hooks.removeAction( 'hookAdded', 'core/react-i18n/filters' );
			hooks.removeAction( 'hookRemoved', 'core/react-i18n/filters' );
		};
	}, [] );

	// rerender translations whenever the `i18n`'s locale data are changed
	useEffect( () => i18n.subscribe( forceUpdate ), [ i18n ] );

	const contextValue = useMemo( () => {
		return makeContextValue( i18n, hooks );
	}, [ i18n, update ] );

	return (
		<I18nContext.Provider value={ contextValue }>
			{ children }
		</I18nContext.Provider>
	);
};

/**
 * Bind an I18n function to its instance
 *
 * @param {I18n} i18n I18n instance
 * @param { '__' | '_n' | '_nx' | '_x' } fnName
 * @param {Hooks} hooks Make context filters instance
 * @return {Function} Bound I18n function with applied transformation hooks
 */
function bindI18nFunction( i18n, fnName, hooks ) {
	const translateFn = i18n[ fnName ];
	const { hasFilter, applyFilters } = hooks;

	if ( ! hasFilter( 'preTranslation' ) && ! hasFilter( 'postTranslation' ) ) {
		return translateFn;
	}

	return ( ...args ) => {
		const filteredArguments = applyFilters(
			'preTranslation',
			args,
			fnName,
			hooks
		);

		return applyFilters(
			'postTranslation',
			translateFn( ...filteredArguments ),
			filteredArguments,
			fnName,
			hooks
		);
	};
}

/**
 * Utility to make a new context value
 *
 * @param {I18n} i18n The I18n instance
 * @param {Hooks} hooks Content filters instance
 *
 * @return {Object} The context value with bound translation functions
 */
function makeContextValue( i18n, hooks ) {
	return {
		__: bindI18nFunction( i18n, '__', hooks ),
		_n: bindI18nFunction( i18n, '_n', hooks ),
		_nx: bindI18nFunction( i18n, '_nx', hooks ),
		_x: bindI18nFunction( i18n, '_x', hooks ),
		isRTL: i18n.isRTL,
		hasTranslation: i18n.hasTranslation,
		addFilter: hooks.addFilter,
		removeFilter: hooks.removeFilter,
	};
}

/**
 * React hook providing i18n translate functions
 *
 * @example
 *
 * import { useI18n } from '@automattic/react-i18n';
 * function MyComponent() {
 *   const { __ } = useI18n();
 *   return <div>{ __( 'Translate me.', 'text-domain' ) }</div>;
 * }
 */
export const useI18n = () => useContext( I18nContext );

/**
 * React hook providing i18n translate functions
 *
 * @param InnerComponent Component that will receive translate functions as props
 * @return Component enhanced with i18n context
 *
 * @example
 *
 * import { withI18n } from '@automattic/react-i18n';
 * function MyComponent( { __ } ) {
 *   return <div>{ __( 'Translate me.', 'text-domain' ) }</div>;
 * }
 * export default withI18n( MyComponent );
 */
export const withI18n = createHigherOrderComponent( ( InnerComponent ) => {
	return ( props ) => {
		const i18n = useI18n();
		return <InnerComponent { ...i18n } { ...props } />;
	};
}, 'withI18n' );
