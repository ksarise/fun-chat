import BaseComponentGenerator from '../../components/base-component';
import InputField from './input-field';
import LabelElement from './label';
import Validator from './validation';

export default class NameBlock {
  private block: HTMLElement;

  private NameLabel: LabelElement;

  public NameInput: InputField;

  private errorInput: HTMLElement;

  constructor(
    className: string,
    content: string,
    type: string,
    eventCallback: () => void
  ) {
    const blockGen = new BaseComponentGenerator({
      tag: 'div',
      className,
      type,
      event: 'input',
      eventCallback,
    });
    this.block = blockGen.getElement();

    this.NameLabel = new LabelElement(`${className.trim()}Label`, content);
    this.NameInput = new InputField(`${className.trim()}Input`, type, () =>
      this.validateForm(this.NameInput.getElement().value, type)
    );
    this.errorInput = new BaseComponentGenerator({
      tag: 'span',
      className: 'inputError',
    }).getElement();
    blockGen.appendChildren([
      this.NameLabel.getLabel(),
      this.NameInput.getElement(),
      this.errorInput,
    ]);
  }

  public getBlock(): HTMLElement {
    return this.block;
  }

  public validateForm(value: string, validType: string): void {
    if (Validator(value, validType) !== 'ok') {
      this.block.classList.remove('valid');
      this.errorInput.textContent = `${Validator(value, validType)}`;
    } else {
      this.block.classList.add('valid');
      this.errorInput.textContent = '';
    }
  }
}