import unittest
from app.tarot_draw import DECK, SPREADS, draw_cards, reflection

class TarotTests(unittest.TestCase):
    def test_deck_and_all_interpretations(self):
        self.assertEqual(len(DECK),78)
        self.assertEqual(len(set(DECK)),78)
        for card in DECK:
            for reverse in [False,True]:
                self.assertTrue(all(reflection(card,reverse).values()))

    def test_all_spreads_have_unique_cards_and_correct_positions(self):
        for spread,(name,positions) in SPREADS.items():
            for _ in range(10):
                result=draw_cards(spread,'一次测试')
                cards=result['cards']
                self.assertEqual(result['engine'],'mengsu-reflection-v1')
                self.assertEqual(len(cards),len(positions))
                self.assertEqual([c['position'] for c in cards],list(positions))
                self.assertEqual(len({c['card'] for c in cards}),len(cards))
                self.assertTrue(all(c['orientation'] in ('正位','逆位') for c in cards))

    def test_draws_have_separate_ids_without_question_weighting_metadata(self):
        a,b=draw_cards('three','同一个问题'),draw_cards('three','同一个问题')
        self.assertNotEqual(a['draw_id'],b['draw_id'])
        self.assertNotIn('time_factor',a)
        self.assertNotIn('seed',a)
        with self.assertRaises(ValueError): draw_cards('bad')

if __name__=='__main__': unittest.main()
