import {useMemo} from 'react';
import {useInput, useCursor} from 'ink';
import chalk from 'chalk';
import stringWidth from 'string-width';
import {type TextInputState} from './use-text-input-state.js';

export type UseTextInputProps = {
	/**
	 * When disabled, user input is ignored.
	 *
	 * @default false
	 */
	isDisabled?: boolean;

	/**
	 * Text input state.
	 */
	state: TextInputState;

	/**
	 * Text to display when input is empty.
	 */
	placeholder?: string;

	/**
	 * Row position of the text input relative to Ink's output origin.
	 * Used to position the real terminal cursor for IME (Input Method Editor) support.
	 * When set, CJK (Korean, Japanese, Chinese) composition windows appear
	 * at the correct position instead of the bottom-left corner.
	 */
	cursorRow?: number;
};

export type UseTextInputResult = {
	/**
	 * Input value.
	 */
	inputValue: string;
};

const cursor = chalk.inverse(' ');

export const useTextInput = ({
	isDisabled = false,
	state,
	placeholder = '',
	cursorRow,
}: UseTextInputProps): UseTextInputResult => {
	const {setCursorPosition} = useCursor();

	// Position the real terminal cursor for IME composition support.
	// This allows CJK input method windows to appear at the correct location.
	if (!isDisabled && cursorRow !== undefined) {
		const textBeforeCursor = state.value.slice(0, state.cursorOffset);
		setCursorPosition({x: stringWidth(textBeforeCursor), y: cursorRow});
	} else {
		setCursorPosition(undefined);
	}

	const renderedPlaceholder = useMemo(() => {
		if (isDisabled) {
			return placeholder ? chalk.dim(placeholder) : '';
		}

		return placeholder && placeholder.length > 0
			? chalk.inverse(placeholder[0]) + chalk.dim(placeholder.slice(1))
			: cursor;
	}, [isDisabled, placeholder]);

	const renderedValue = useMemo(() => {
		if (isDisabled) {
			return state.value;
		}

		let index = 0;
		let result = state.value.length > 0 ? '' : cursor;

		for (const char of state.value) {
			result += index === state.cursorOffset ? chalk.inverse(char) : char;

			index++;
		}

		if (state.suggestion) {
			if (state.cursorOffset === state.value.length) {
				result +=
					chalk.inverse(state.suggestion[0]) +
					chalk.dim(state.suggestion.slice(1));
			} else {
				result += chalk.dim(state.suggestion);
			}

			return result;
		}

		if (state.value.length > 0 && state.cursorOffset === state.value.length) {
			result += cursor;
		}

		return result;
	}, [isDisabled, state.value, state.cursorOffset, state.suggestion]);

	useInput(
		(input, key) => {
			if (
				key.upArrow ||
				key.downArrow ||
				(key.ctrl && input === 'c') ||
				key.tab ||
				(key.shift && key.tab)
			) {
				return;
			}

			if (key.return) {
				state.submit();
				return;
			}

			if (key.leftArrow) {
				state.moveCursorLeft();
			} else if (key.rightArrow) {
				state.moveCursorRight();
			} else if (key.backspace || key.delete) {
				state.delete();
			} else {
				state.insert(input);
			}
		},
		{isActive: !isDisabled},
	);

	return {
		inputValue: state.value.length > 0 ? renderedValue : renderedPlaceholder,
	};
};
