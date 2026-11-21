import { fireEvent, render, screen } from '@testing-library/react-native';
import { RainSlider } from '../../src/components/RainSlider';

describe('RainSlider', () => {
  it('starts without a chosen value', async () => {
    await render(
      <RainSlider question="Vai chover?" value={null} onChange={jest.fn()} testID="q" />,
    );
    expect(screen.getByTestId('q-label')).toHaveTextContent('Arraste para escolher');
  });

  it('uses integer steps from 0 to 5 and reports the rounded value', async () => {
    const onChange = jest.fn();
    await render(<RainSlider question="Vai chover?" value={null} onChange={onChange} testID="q" />);
    const slider = screen.getByTestId('q-slider');

    expect(slider.props).toMatchObject({ minimumValue: 0, maximumValue: 5, step: 1 });
    await fireEvent(slider, 'valueChange', 3.2);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('shows "N - Rótulo" and exposes accessibility info', async () => {
    await render(
      <RainSlider question="Vai chover à tarde?" value={5} onChange={jest.fn()} testID="q" />,
    );
    expect(screen.getByTestId('q-label')).toHaveTextContent("5 - Pé-d'água");
    const slider = screen.getByTestId('q-slider');
    expect(slider.props.accessibilityLabel).toBe('Vai chover à tarde?');
    expect(slider.props.accessibilityValue).toEqual({ text: "5 - Pé-d'água" });
  });
});
